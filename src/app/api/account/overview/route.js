import { NextResponse } from "next/server";
import { currentUser, publicUser } from "@/lib/userAuth";
import { db, plain } from "@/lib/workshop";

// Everything the signed-in customer can see: profile, bookings, job cards, invoices.
// Works with the website cookie or the app's Bearer token.
export async function GET(request) {
  const user = await currentUser(request);
  if (!user) return NextResponse.json({ success: false, error: "Please sign in again." }, { status: 401 });
  const d = await db();
  const userId = String(user._id);
  const [bookings, jobCards, invoices] = await Promise.all([
    d.collection("bookings").find({ userId }).project({ email: 0 }).sort({ createdAt: -1 }).limit(200).toArray(),
    d.collection("jobcards").find({ userId }).sort({ createdAt: -1 }).limit(200).toArray(),
    d.collection("invoices").find({ userId, status: { $ne: "cancelled" } }).sort({ createdAt: -1 }).limit(200).toArray(),
  ]);
  return NextResponse.json({
    success: true,
    user: publicUser(user),
    bookings: plain(bookings),
    jobCards: plain(jobCards),
    invoices: plain(invoices),
  });
}
