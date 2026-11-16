// Sign-in for the staff section of the mobile app.
// Credentials live only on the server (STAFF_USERNAME / STAFF_PASSWORD), and the
// app gets a signed token that expires, instead of a password stored on the phone.
import { createHmac, timingSafeEqual } from "node:crypto";

const TTL_DAYS = 30;

const secret = () => {
  const s = process.env.STAFF_TOKEN_SECRET;
  if (!s || s.length < 32) throw new Error("STAFF_TOKEN_SECRET is not set (32+ characters)");
  return s;
};

const sign = payload => createHmac("sha256", secret()).update(payload).digest("base64url");

const sameText = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
};

export function checkCredentials(username, password) {
  const u = process.env.STAFF_USERNAME, p = process.env.STAFF_PASSWORD;
  if (!u || !p) return false;
  return sameText(username || "", u) & sameText(password || "", p) ? true : false;
}

export function issueToken(username) {
  const payload = Buffer.from(JSON.stringify({ sub: username, exp: Date.now() + TTL_DAYS * 864e5 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

// Returns the staff user name, or null if the request has no valid token.
export function verifyRequest(request) {
  try {
    const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const [payload, sig] = token.split(".");
    if (!payload || !sig || !sameText(sig, sign(payload))) return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    return data.exp > Date.now() ? data.sub : null;
  } catch {
    return null;
  }
}
