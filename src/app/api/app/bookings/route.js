import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { currentUser } from "@/lib/userAuth";

// The signed-in customer's own bookings (made in the app while signed in).
export async function GET(request) {
  const user = await currentUser(request);
  if (!user) return NextResponse.json({ success: false, error: "Please sign in again." }, { status: 401 });
  try {
    const bookings = await (await clientPromise)
      .db("automotivecarcare")
      .collection("bookings")
      .find({ userId: String(user._id) })
      .project({ email: 0, userId: 0 })
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray();
    return NextResponse.json({ success: true, bookings });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
