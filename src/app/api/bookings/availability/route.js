import { NextResponse } from "next/server";
import { availability, DATE_RE, SLOT_CAPACITY } from "@/lib/slots";

export const dynamic = "force-dynamic";

// Public: how many places are left in each time slot on a date (no customer data).
// GET /api/bookings/availability?date=2026-11-20
export async function GET(request) {
  const date = new URL(request.url).searchParams.get("date") || "";
  if (!DATE_RE.test(date)) return NextResponse.json({ success: false, error: "Invalid date" }, { status: 400 });
  try {
    return NextResponse.json({ success: true, date, capacity: SLOT_CAPACITY, slots: await availability(date) });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
