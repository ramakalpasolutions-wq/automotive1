import { NextResponse } from "next/server";
import { EMAIL_RE, hashSecret, normEmail, publicUser, tokenFor, users, validatePassword } from "@/lib/userAuth";

// Customer sign-up from the mobile app.
export async function POST(request) {
  try {
    const { name, email, phone, password } = await request.json();
    const e = normEmail(email);
    if (!String(name || "").trim()) return bad("Please enter your name.");
    if (!EMAIL_RE.test(e)) return bad("Please enter a valid email.");
    const pwError = validatePassword(password);
    if (pwError) return bad(pwError);

    const col = await users();
    if (await col.findOne({ email: e })) return bad("An account with this email already exists. Please sign in.", 409);
    const now = new Date();
    const doc = {
      name: String(name).trim().slice(0, 80),
      email: e,
      phone: String(phone || "").trim().slice(0, 25),
      passwordHash: await hashSecret(password),
      tokenVersion: 0,
      createdAt: now,
      updatedAt: now,
    };
    const { insertedId } = await col.insertOne(doc);
    const user = { ...doc, _id: insertedId };
    return NextResponse.json({ success: true, token: tokenFor(user), user: publicUser(user) });
  } catch (error) {
    if (error?.code === 11000) return bad("An account with this email already exists. Please sign in.", 409);
    console.error("app signup:", error.message);
    return NextResponse.json({ success: false, error: "Could not create the account. Please try again." }, { status: 500 });
  }
}

const bad = (error, status = 400) => NextResponse.json({ success: false, error }, { status });
