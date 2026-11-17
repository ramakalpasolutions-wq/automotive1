// Shared admin list/create/update/delete for job cards and invoices.
import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/staffAuth";
import { db, isId, nextNumber, oid, plain } from "@/lib/workshop";

const bad = (error, status = 400) => NextResponse.json({ success: false, error }, { status });

export function adminCrud({ collection, kind, clean, level = "admin" }) {
  return {
    // ?id=… one document; ?bookingId=… / ?userId=… filter; otherwise newest 500.
    async GET(request) {
      const denied = requireStaff(request, level);
      if (denied) return denied;
      const sp = new URL(request.url).searchParams;
      const col = (await db()).collection(collection);
      if (sp.get("id")) {
        if (!isId(sp.get("id"))) return bad("Invalid id");
        const doc = await col.findOne({ _id: oid(sp.get("id")) });
        return doc ? NextResponse.json({ success: true, item: plain(doc) }) : bad("Not found", 404);
      }
      const q = {};
      for (const k of ["bookingId", "userId", "jobCardId"]) if (isId(sp.get(k))) q[k] = sp.get(k);
      const items = await col.find(q).sort({ createdAt: -1 }).limit(500).toArray();
      return NextResponse.json({ success: true, items: plain(items) });
    },

    async POST(request) {
      const denied = requireStaff(request, level);
      if (denied) return denied;
      try {
        const doc = await clean(await request.json());
        if (!doc.customer.name) return bad("Customer name is required.");
        const now = new Date();
        const full = { ...doc, number: await nextNumber(kind), createdAt: now, updatedAt: now };
        const { insertedId } = await (await db()).collection(collection).insertOne(full);
        return NextResponse.json({ success: true, item: plain({ ...full, _id: insertedId }) });
      } catch (e) {
        console.error(`${collection} create:`, e.message);
        return bad("Could not save. Please try again.", 500);
      }
    },

    async PUT(request) {
      const denied = requireStaff(request, level);
      if (denied) return denied;
      try {
        const body = await request.json();
        if (!isId(body._id)) return bad("Invalid id");
        const doc = await clean(body);
        if (!doc.customer.name) return bad("Customer name is required.");
        const col = (await db()).collection(collection);
        const res = await col.findOneAndUpdate({ _id: oid(body._id) }, { $set: { ...doc, updatedAt: new Date() } }, { returnDocument: "after" });
        const item = res?.value ?? res;
        return item ? NextResponse.json({ success: true, item: plain(item) }) : bad("Not found", 404);
      } catch (e) {
        console.error(`${collection} update:`, e.message);
        return bad("Could not save. Please try again.", 500);
      }
    },

    async DELETE(request) {
      const denied = requireStaff(request);
      if (denied) return denied;
      const id = new URL(request.url).searchParams.get("id");
      if (!isId(id)) return bad("Invalid id");
      const res = await (await db()).collection(collection).deleteOne({ _id: oid(id) });
      return res.deletedCount ? NextResponse.json({ success: true }) : bad("Not found", 404);
    },
  };
}
