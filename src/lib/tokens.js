// Signed, expiring tokens for customer and staff sign-in.
// The app sends them as "Authorization: Bearer …"; the website keeps them in an
// httpOnly cookie. Each token carries a role, so a customer token can never pass
// a staff check.
import { createHmac, timingSafeEqual } from "node:crypto";

export const COOKIE = { user: "acc_session", staff: "staff_session" };

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

function cookieValue(request, name) {
  const header = request.headers.get("cookie") || "";
  const m = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : "";
}

// Returns the token's payload if it is valid, unexpired and has this role; otherwise null.
export function readToken(request, role) {
  try {
    const bearer = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const token = bearer || cookieValue(request, COOKIE[role]);
    const [payload, sig] = token.split(".");
    if (!payload || !sig || !sameText(sig, sign(payload))) return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    return data.role === role && data.exp > Date.now() ? data : null;
  } catch {
    return null;
  }
}

// Website sign-in: store the token in a cookie JavaScript can't read.
export function setSessionCookie(response, role, token, days) {
  response.cookies.set(COOKIE[role], token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: days * 86400,
  });
  return response;
}

export function clearSessionCookie(response, role) {
  response.cookies.set(COOKIE[role], "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}
