// POST /api/auth/login — username + password only
import {
  getUser, setToken, newToken, verifyPassword,
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

  const user = await getUser(username);
  if (!user || !verifyPassword(password, user.salt, user.hash)) {
    res.status(401).json({ error: "invalid" });
    return;
  }

  const token = newToken();
  await setToken(token, username);

  res.status(200).json({ token, username });
}
