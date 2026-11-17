import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { requireStaff, verifyRequest } from "@/lib/staffAuth";

// Bookings for the mobile app's staff section. Every call needs a staff token.
const bookings = async () => (await clientPromise).db("automotivecarcare").collection("bookings");
const unauthorized = () => NextResponse.json({ success: false, error: "Please sign in again" }, { status: 401 });
const validId = id => typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id);

export async function GET(request) {
  if (!verifyRequest(request)) return unauthorized();
  try {
    const list = await (await bookings()).find({}).sort({ createdAt: -1 }).limit(500).toArray();
    return NextResponse.json({ success: true, bookings: list });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// { id, status: "confirmed" } — confirming emails the customer, like the web dashboard.
export async function PATCH(request) {
  if (!verifyRequest(request)) return unauthorized();
  try {
    const { id, status } = await request.json();
    if (!validId(id) || !["pending", "confirmed"].includes(status)) {
      return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
    }
    const col = await bookings();
    const _id = new ObjectId(id);
    const res = await col.updateOne({ _id }, { $set: { status, updatedAt: new Date() } });
    if (!res.matchedCount) return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 });
    const booking = await col.findOne({ _id });

    let emailSent = false;
    if (status === "confirmed") {
      try {
        const { sendAcceptanceEmail } = await import("@/lib/email");
        await sendAcceptanceEmail(booking);
        emailSent = true;
      } catch (e) {
        console.error("confirmation email:", e.message);
      }
    }
    return NextResponse.json({ success: true, booking, emailSent });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const denied = requireStaff(request); // admin only
  if (denied) return denied;
  const id = new URL(request.url).searchParams.get("id");
  if (!validId(id)) return NextResponse.json({ success: false, error: "Invalid booking ID" }, { status: 400 });
  try {
    const res = await (await bookings()).deleteOne({ _id: new ObjectId(id) });
    if (!res.deletedCount) return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
