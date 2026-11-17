import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/staffAuth";
import { db, isId, oid } from "@/lib/workshop";

// Customer accounts, for linking a job card / invoice to the right person.
// ?q=name, email or phone (min 2 characters), or ?id=…
export async function GET(request) {
  const denied = requireStaff(request, "manager");
  if (denied) return denied;
  const sp = new URL(request.url).searchParams;
  const col = (await db()).collection("appusers");
  const projection = { name: 1, email: 1, phone: 1 };
  if (isId(sp.get("id"))) {
    const u = await col.findOne({ _id: oid(sp.get("id")) }, { projection });
    return NextResponse.json({ success: true, customers: u ? [u] : [] });
  }
  const q = String(sp.get("q") || "").trim();
  if (q.length < 2) return NextResponse.json({ success: true, customers: [] });
  const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const digits = q.replace(/\D/g, "");
  const customers = await col
    .find({ $or: [{ name: rx }, { email: rx }, ...(digits.length >= 4 ? [{ phone: new RegExp(digits) }] : [])] }, { projection })
    .limit(10)
    .toArray();
  return NextResponse.json({ success: true, customers });
}
