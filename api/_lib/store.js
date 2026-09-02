// KEWEN chat — shared store (Upstash-backed KV + auth helpers).
// Reads KV_REST_API_URL / KV_REST_API_TOKEN (Vercel KV auto-injects) or
// UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN (standalone Upstash).
// No third-party SDK — talks to the Upstash REST API with global fetch.

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
const HAS_KV = Boolean(KV_URL && KV_TOKEN);

function enc(v) { return encodeURIComponent(v); }

async function kv(cmd, ...parts) {
  if (!HAS_KV) throw new Error("kv_unconfigured");
  const method = cmd === "get" || cmd === "exists" ? "GET" : "POST";
  const r = await fetch(`${KV_URL}/${[cmd, ...parts].map(enc).join("/")}`, {
    method,
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  });
  return r.json().catch(() => null);
}

// ---- usernames / passwords ----
export function validUsername(u) {
  return typeof u === "string" && /^[A-Za-z0-9_]{2,20}$/.test(u);
}
export function validPassword(p) {
  return typeof p === "string" && p.length >= 6 && p.length <= 72;
}
export function makeSalt() { return randomBytes(16).toString("hex"); }
export function newToken() { return randomBytes(24).toString("hex"); }

export function hashPassword(password, saltHex) {
  return scryptSync(password, Buffer.from(saltHex, "hex"), 64).toString("hex");
}
export function verifyPassword(password, saltHex, storedHashHex) {
  const h = Buffer.from(hashPassword(password, saltHex), "hex");
  const s = Buffer.from(storedHashHex, "hex");
  return h.length === s.length && timingSafeEqual(h, s);
}

// ---- key helpers ----
const tokenKey = (t) => `token:${t}`;
const userKey = (u) => `user:${u}`;
export const histKey = (u, c) => `hist:${u}:${c}`;

// ---- users ----
export async function getUser(username) {
  const j = await kv("get", userKey(username));
  if (!j || j.result == null) return null;
  try { return JSON.parse(j.result); } catch { return null; }
}
export async function setUser(username, rec) {
  await kv("set", userKey(username), JSON.stringify(rec));
}

// ---- sessions ----
export async function usernameForToken(token) {
  if (!token) return null;
  const j = await kv("get", tokenKey(token));
  return (j && j.result) || null;
}
export async function setToken(token, username) {
  // 30-day session token
  await kv("setex", tokenKey(token), "2592000", username);
}
export async function getUserFromToken(token) {
  return usernameForToken(token);
}

// ---- history ----
export async function loadHistory(username, character) {
  const j = await kv("get", histKey(username, character));
  if (!j || j.result == null) return [];
  try { const a = JSON.parse(j.result); return Array.isArray(a) ? a : []; } catch { return []; }
}
export async function saveHistory(username, character, messages) {
  const arr = Array.isArray(messages) ? messages.slice(-200) : [];
  await kv("set", histKey(username, character), JSON.stringify(arr));
}

export function kvReady() { return HAS_KV; }
