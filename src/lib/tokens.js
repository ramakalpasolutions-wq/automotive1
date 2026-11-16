// Signed, expiring tokens for the mobile app (staff and customer sign-in).
// Each token carries a role, so a customer token can never pass a staff check.
import { createHmac, timingSafeEqual } from "node:crypto";

const secret = () => {
  const s = process.env.STAFF_TOKEN_SECRET;
  if (!s || s.length < 32) throw new Error("STAFF_TOKEN_SECRET is not set (32+ characters)");
  return s;
};

const sign = payload => createHmac("sha256", secret()).update(payload).digest("base64url");

export const sameText = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
};

export function issueToken(role, sub, days = 30, extra = {}) {
  const payload = Buffer.from(JSON.stringify({ role, sub, exp: Date.now() + days * 864e5, ...extra })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

// Returns the token's payload if it is valid, unexpired and has this role; otherwise null.
export function readToken(request, role) {
  try {
    const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const [payload, sig] = token.split(".");
    if (!payload || !sig || !sameText(sig, sign(payload))) return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    return data.role === role && data.exp > Date.now() ? data : null;
  } catch {
    return null;
  }
}
