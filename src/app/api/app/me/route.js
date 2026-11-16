import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { checkSecret, currentUser, hashSecret, publicUser, tokenFor, users, validatePassword } from "@/lib/userAuth";

const signedOut = () => NextResponse.json({ success: false, error: "Please sign in again." }, { status: 401 });

export async function GET(request) {
  const user = await currentUser(request);
  return user ? NextResponse.json({ success: true, user: publicUser(user) }) : signedOut();
}

// Update name / phone, or change password ({ currentPassword, newPassword }).
export async function PATCH(request) {
  const user = await currentUser(request);
  if (!user) return signedOut();
  try {
    const body = await request.json();
    const set = { updatedAt: new Date() };
    if (body.name !== undefined) {
      if (!String(body.name).trim()) return bad("Please enter your name.");
      set.name = String(body.name).trim().slice(0, 80);
    }
    if (body.phone !== undefined) set.phone = String(body.phone).trim().slice(0, 25);
    let token;
    if (body.newPassword !== undefined) {
      if (!(await checkSecret(body.currentPassword || "", user.passwordHash))) return bad("Your current password is not correct.");
      const pwError = validatePassword(body.newPassword);
      if (pwError) return bad(pwError);
      set.passwordHash = await hashSecret(body.newPassword);
      set.tokenVersion = (user.tokenVersion || 0) + 1;
    }
    await (await users()).updateOne({ _id: user._id }, { $set: set });
    const updated = { ...user, ...set };
    if (set.tokenVersion !== undefined) token = tokenFor(updated);
    return NextResponse.json({ success: true, user: publicUser(updated), ...(token ? { token } : {}) });
  } catch (error) {
    console.error("app me patch:", error.message);
    return NextResponse.json({ success: false, error: "Could not save. Please try again." }, { status: 500 });
  }
}

// Deletes the account (required by the App Store and Google Play). Past bookings
// stay with the workshop as service records but are no longer linked to the account.
export async function DELETE(request) {
  const user = await currentUser(request);
  if (!user) return signedOut();
  try {
    const db = (await clientPromise).db("automotivecarcare");
    await db.collection("bookings").updateMany({ userId: String(user._id) }, { $unset: { userId: "" } });
    await (await users()).deleteOne({ _id: user._id });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("app me delete:", error.message);
    return NextResponse.json({ success: false, error: "Could not delete the account. Please try again." }, { status: 500 });
  }
}

const bad = (error, status = 400) => NextResponse.json({ success: false, error }, { status });
