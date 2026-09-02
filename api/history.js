// /api/history — load / save chat history per (user, character).
// Auth via `Authorization: Bearer <token>`.
import { getUserFromToken, loadHistory, saveHistory } from "../_lib/store.js";

const DEFAULT_CHAR = "kayoko";

function readToken(req) {
  const h = req.headers.authorization || "";
  if (h.startsWith("Bearer ")) return h.slice(7).trim();
  if (req.body && typeof req.body === "object" && typeof req.body.token === "string") return req.body.token;
  return "";
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  if (req.method === "OPTIONS") { res.status(204).end(); return; }

  const username = await getUserFromToken(readToken(req));
  if (!username) { res.status(401).json({ error: "unauthorized" }); return; }

  const character = (req.method === "GET"
    ? (req.query && req.query.character)
    : (req.body && req.body.character)) || DEFAULT_CHAR;

  if (req.method === "GET") {
    const messages = await loadHistory(username, character);
    res.status(200).json({ messages, character });
    return;
  }

  if (req.method === "POST") {
    const messages = Array.isArray(req.body && req.body.messages) ? req.body.messages : [];
    await saveHistory(username, character, messages);
    res.status(200).json({ saved: true });
    return;
  }

  res.status(405).json({ error: "method_not_allowed" });
}
