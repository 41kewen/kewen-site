// POST /api/auth/register — username + password only
import {
  getUser, setUser, setToken, newToken, makeSalt, hashPassword,
  validUsername, validPassword,
} from "../_lib/store.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ error: "method_not_allowed" }); return; }

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = null; } }

  const username = body && typeof body.username === "string" ? body.username.trim() : "";
  const password = body && typeof body.password === "string" ? body.password : "";

  if (!validUsername(username)) { res.status(400).json({ error: "bad_username" }); return; }
  if (!validPassword(password)) { res.status(400).json({ error: "bad_password" }); return; }
  if (await getUser(username)) { res.status(409).json({ error: "exists" }); return; }

  const salt = makeSalt();
  const hash = hashPassword(password, salt);
  await setUser(username, { salt, hash, created: Date.now() });

  const token = newToken();
  await setToken(token, username);

  res.status(200).json({ token, username });
}
