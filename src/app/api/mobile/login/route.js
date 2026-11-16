import { NextResponse } from "next/server";
import { checkCredentials, issueToken } from "@/lib/staffAuth";

// Slow down password guessing: a short pause on every failed attempt.
const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function POST(request) {
  try {
    const { username, password } = await request.json();
    if (!checkCredentials(username, password)) {
      await sleep(1000);
      return NextResponse.json({ success: false, error: "Invalid username or password" }, { status: 401 });
    }
    return NextResponse.json({ success: true, token: issueToken(username), name: username });
  } catch (error) {
    console.error("mobile login:", error.message);
    return NextResponse.json({ success: false, error: "Sign-in is not available" }, { status: 500 });
  }
}
