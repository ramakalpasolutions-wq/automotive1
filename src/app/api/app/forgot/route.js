import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { hashSecret, normEmail, resetCode, users } from "@/lib/userAuth";

// Emails a 6-digit code for resetting the password. Always answers the same way,
// so it can't be used to find out which emails have accounts.
export async function POST(request) {
  const ok = NextResponse.json({ success: true, message: "If that email has an account, we've sent a code to it." });
  try {
    const { email } = await request.json();
    const col = await users();
    const user = await col.findOne({ email: normEmail(email) });
    if (!user) return ok;
    // At most one code per minute.
    if (user.resetSentAt && Date.now() - new Date(user.resetSentAt).getTime() < 60_000) return ok;

    const code = resetCode();
    await col.updateOne(
      { _id: user._id },
      { $set: { resetHash: await hashSecret(code), resetExpires: new Date(Date.now() + 15 * 60_000), resetAttempts: 0, resetSentAt: new Date() } }
    );
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_APP_PASSWORD },
    });
    await transporter.sendMail({
      from: `"Automotive Car Care" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: `Your password reset code: ${code}`,
      text: `Hi ${user.name},\n\nYour Automotive Car Care password reset code is ${code}. It expires in 15 minutes.\n\nIf you didn't ask for this, you can ignore this email.`,
      html: `<p>Hi ${escapeHtml(user.name)},</p><p>Your Automotive Car Care password reset code is</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p><p>It expires in 15 minutes. If you didn't ask for this, you can ignore this email.</p>`,
    });
    return ok;
  } catch (error) {
    console.error("app forgot:", error.message);
    return ok;
  }
}

const escapeHtml = s => String(s || "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
