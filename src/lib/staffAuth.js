// Staff sign-in for the admin panel, the job card manager and the app's staff section.
// Two levels:
//   admin   — STAFF_USERNAME / STAFF_PASSWORD: everything.
//   manager — MANAGER_USERNAME / MANAGER_PASSWORD: appointments and job cards only.
import { NextResponse } from "next/server";
import { issueToken as issue, readToken, sameText } from "./tokens";

export const STAFF_TOKEN_DAYS = 30;

const matches = (username, password, u, p) => {
  if (!u || !p) return false;
  // Compare both, always, so timing doesn't reveal which one was wrong.
  const okUser = sameText(username || "", u);
  const okPass = sameText(password || "", p);
  return okUser && okPass;
};

// Returns "admin", "manager" or null.
export function checkCredentials(username, password) {
  const e = process.env;
  if (matches(username, password, e.STAFF_USERNAME, e.STAFF_PASSWORD)) return "admin";
  if (matches(username, password, e.MANAGER_USERNAME, e.MANAGER_PASSWORD)) return "manager";
  return null;
}

export const issueToken = (username, level = "admin") => issue("staff", username, STAFF_TOKEN_DAYS, { level });

// { name, level } for a valid staff token (app header or website cookie), else null.
export function staffFromRequest(request) {
  const t = readToken(request, "staff");
  return t ? { name: t.sub, level: t.level === "manager" ? "manager" : "admin" } : null;
}

// Kept for older callers: the staff user name or null.
export const verifyRequest = request => staffFromRequest(request)?.name || null;

// For API handlers: returns a 401/403 response to send back, or null if allowed.
// level "admin" (default) = admins only; "manager" = admins and managers.
export function requireStaff(request, level = "admin") {
  const s = staffFromRequest(request);
  if (!s) return NextResponse.json({ success: false, error: "Please sign in again." }, { status: 401 });
  if (level === "admin" && s.level !== "admin") {
    return NextResponse.json({ success: false, error: "Only the admin can do this." }, { status: 403 });
  }
  return null;
}
