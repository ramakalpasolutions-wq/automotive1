import { NextResponse } from "next/server";
import { checkCredentials, issueToken, STAFF_TOKEN_DAYS } from "@/lib/staffAuth";
import { setSessionCookie } from "@/lib/tokens";

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Admin panel sign-in: checks STAFF_USERNAME / STAFF_PASSWORD on the server
// and keeps the session in an httpOnly cookie.
export async function POST(request) {
  try {
    const { username, password } = await request.json();
    const level = checkCredentials(username, password);
    if (!level) {
      await sleep(1000);
      return NextResponse.json({ success: false, error: "Invalid username or password" }, { status: 401 });
    }
    const res = NextResponse.json({ success: true, level });
    return setSessionCookie(res, "staff", issueToken(username, level), STAFF_TOKEN_DAYS);
  } catch (error) {
    console.error("admin login:", error.message);
    return NextResponse.json({ success: false, error: "Sign-in is not available" }, { status: 500 });
  }
}
