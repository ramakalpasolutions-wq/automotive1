// Sign-in for the staff section of the mobile app.
// Credentials live only on the server (STAFF_USERNAME / STAFF_PASSWORD), and the
// app gets a signed token that expires, instead of a password stored on the phone.
import { issueToken as issue, readToken, sameText } from "./tokens";

export function checkCredentials(username, password) {
  const u = process.env.STAFF_USERNAME, p = process.env.STAFF_PASSWORD;
  if (!u || !p) return false;
  // Compare both, always, so timing doesn't reveal which one was wrong.
  const okUser = sameText(username || "", u);
  const okPass = sameText(password || "", p);
  return okUser && okPass;
}

export const issueToken = username => issue("staff", username);

// Returns the staff user name, or null if the request has no valid staff token.
export const verifyRequest = request => readToken(request, "staff")?.sub || null;
