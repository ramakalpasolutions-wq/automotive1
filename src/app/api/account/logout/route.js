import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/tokens";

export async function POST() {
  return clearSessionCookie(NextResponse.json({ success: true }), "user");
}
