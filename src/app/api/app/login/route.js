import { NextResponse } from "next/server";
import { checkSecret, normEmail, publicUser, sleep, tokenFor, users } from "@/lib/userAuth";

// Customer sign-in from the mobile app.
export async function POST(request) {
  try {
    const { email, password } = await request.json();
    const user = await (await users()).findOne({ email: normEmail(email) });
    if (!user || !(await checkSecret(password || "", user.passwordHash))) {
      await sleep(800); // slow down password guessing
      return NextResponse.json({ success: false, error: "Wrong email or password." }, { status: 401 });
    }
    return NextResponse.json({ success: true, token: tokenFor(user), user: publicUser(user) });
  } catch (error) {
    console.error("app login:", error.message);
    return NextResponse.json({ success: false, error: "Sign-in is not available right now." }, { status: 500 });
  }
}
