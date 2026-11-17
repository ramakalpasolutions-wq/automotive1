import { NextResponse } from "next/server";
import { staffFromRequest } from "@/lib/staffAuth";

// Who is signed in to the admin panel / manager portal: { name, level }.
export async function GET(request) {
  const s = staffFromRequest(request);
  return s ? NextResponse.json({ success: true, ...s }) : NextResponse.json({ success: false }, { status: 401 });
}
