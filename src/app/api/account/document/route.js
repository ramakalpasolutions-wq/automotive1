import { NextResponse } from "next/server";
import { currentUser } from "@/lib/userAuth";
import { db, isId, oid, plain } from "@/lib/workshop";

// One job card or invoice — only if it belongs to the signed-in customer.
// ?type=invoice|jobcard&id=…
export async function GET(request) {
  const user = await currentUser(request);
  if (!user) return NextResponse.json({ success: false, error: "Please sign in again." }, { status: 401 });
  const sp = new URL(request.url).searchParams;
  const collection = { invoice: "invoices", jobcard: "jobcards" }[sp.get("type")];
  const id = sp.get("id");
  if (!collection || !isId(id)) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  const doc = await (await db()).collection(collection).findOne({ _id: oid(id), userId: String(user._id) });
  return doc
    ? NextResponse.json({ success: true, item: plain(doc) })
    : NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
}
