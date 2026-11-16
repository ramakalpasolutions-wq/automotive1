import { NextResponse } from "next/server";
import { checkSecret, hashSecret, normEmail, publicUser, sleep, tokenFor, users, validatePassword } from "@/lib/userAuth";

const MAX_ATTEMPTS = 5;

// Sets a new password using the emailed code, then signs the customer in.
export async function POST(request) {
  try {
    const { email, code, password } = await request.json();
    const pwError = validatePassword(password);
    if (pwError) return bad(pwError);

    const col = await users();
    const user = await col.findOne({ email: normEmail(email) });
    const usable = user?.resetHash && new Date(user.resetExpires) > new Date() && (user.resetAttempts || 0) < MAX_ATTEMPTS;
    if (!usable) {
      await sleep(800);
      return bad("This code has expired. Please request a new one.");
    }
    if (!(await checkSecret(String(code || "").trim(), user.resetHash))) {
      await col.updateOne({ _id: user._id }, { $inc: { resetAttempts: 1 } });
      await sleep(800);
      return bad("That code is not correct.");
    }
    const tokenVersion = (user.tokenVersion || 0) + 1; // signs out other devices
    await col.updateOne(
      { _id: user._id },
      {
        $set: { passwordHash: await hashSecret(password), tokenVersion, updatedAt: new Date() },
        $unset: { resetHash: "", resetExpires: "", resetAttempts: "", resetSentAt: "" },
      }
    );
    const updated = { ...user, tokenVersion };
    return NextResponse.json({ success: true, token: tokenFor(updated), user: publicUser(updated) });
  } catch (error) {
    console.error("app reset:", error.message);
    return NextResponse.json({ success: false, error: "Could not reset the password. Please try again." }, { status: 500 });
  }
}

const bad = (error, status = 400) => NextResponse.json({ success: false, error }, { status });
