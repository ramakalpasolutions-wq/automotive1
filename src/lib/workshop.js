// Job cards and invoices: created in the admin panel, shown to the customer in
// their account (website and app). Totals are always calculated on the server.
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

export const db = async () => (await clientPromise).db("automotivecarcare");

export const JOB_STATUSES = ["open", "in_progress", "completed", "delivered"];
export const JOB_STATUS_LABEL = { open: "Open", in_progress: "In progress", completed: "Completed", delivered: "Delivered" };
export const INVOICE_STATUSES = ["unpaid", "paid", "cancelled"];
export const PAYMENT_METHODS = ["", "cash", "upi", "card", "bank transfer"];

const str = (v, max = 500) => String(v ?? "").trim().slice(0, max);
const num = (v, min = 0) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= min ? Math.round(n * 100) / 100 : 0;
};
export const isId = v => typeof v === "string" && ObjectId.isValid(v) && /^[0-9a-f]{24}$/i.test(v);
export const oid = v => new ObjectId(v);

// Sequential numbers per year: JC-2026-0001, INV-2026-0001.
export async function nextNumber(kind) {
  const year = new Date().getFullYear();
  const prefix = kind === "invoice" ? "INV" : "JC";
  const res = await (await db())
    .collection("counters")
    .findOneAndUpdate({ _id: `${kind}-${year}` }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: "after" });
  const seq = (res?.value ?? res)?.seq || 1;
  return `${prefix}-${year}-${String(seq).padStart(4, "0")}`;
}

const cleanCustomer = c => ({ name: str(c?.name, 100), phone: str(c?.phone, 30), email: str(c?.email, 120).toLowerCase() });
const cleanVehicle = v => ({
  brand: str(v?.brand, 60),
  model: str(v?.model, 80),
  regNo: str(v?.regNo, 20).toUpperCase(),
  odometer: str(v?.odometer, 20),
  fuel: str(v?.fuel, 20),
});

// Link to a customer account only when the admin picked one (never guessed from an email).
async function linkFields(body) {
  const out = {};
  if (isId(body.userId)) {
    const u = await (await db()).collection("appusers").findOne({ _id: oid(body.userId) }, { projection: { _id: 1 } });
    if (u) out.userId = String(u._id);
  } else out.userId = null;
  out.bookingId = isId(body.bookingId) ? body.bookingId : null;
  return out;
}

export async function cleanJobCard(body) {
  return {
    customer: cleanCustomer(body.customer),
    vehicle: cleanVehicle(body.vehicle),
    complaints: str(body.complaints, 3000),
    workItems: (Array.isArray(body.workItems) ? body.workItems : [])
      .map(w => ({ description: str(w?.description, 300), done: !!w?.done }))
      .filter(w => w.description)
      .slice(0, 100),
    parts: (Array.isArray(body.parts) ? body.parts : [])
      .map(p => ({ name: str(p?.name, 200), qty: num(p?.qty) || 1 }))
      .filter(p => p.name)
      .slice(0, 100),
    pickup: body.pickup?.required
      ? { required: true, address: str(body.pickup.address, 300), landmark: str(body.pickup.landmark, 120) }
      : { required: false },
    technician: str(body.technician, 80),
    status: JOB_STATUSES.includes(body.status) ? body.status : "open",
    expectedDelivery: str(body.expectedDelivery, 20),
    notes: str(body.notes, 3000),
    ...(await linkFields(body)),
  };
}

export function invoiceTotals(items, discount, taxRate) {
  const subtotal = Math.round(items.reduce((s, i) => s + i.qty * i.rate, 0) * 100) / 100;
  const disc = Math.min(num(discount), subtotal);
  const taxable = subtotal - disc;
  const tax = Math.round(taxable * num(taxRate) / 100 * 100) / 100;
  return { subtotal, discount: disc, taxRate: num(taxRate), tax, total: Math.round((taxable + tax) * 100) / 100 };
}

export async function cleanInvoice(body) {
  const items = (Array.isArray(body.items) ? body.items : [])
    .map(i => ({
      description: str(i?.description, 300),
      type: i?.type === "part" ? "part" : "labour",
      qty: num(i?.qty) || 1,
      rate: num(i?.rate),
    }))
    .filter(i => i.description)
    .slice(0, 200);
  return {
    customer: cleanCustomer(body.customer),
    vehicle: cleanVehicle(body.vehicle),
    date: str(body.date, 20) || new Date().toISOString().slice(0, 10),
    items,
    ...invoiceTotals(items, body.discount, body.taxRate),
    status: INVOICE_STATUSES.includes(body.status) ? body.status : "unpaid",
    paymentMethod: PAYMENT_METHODS.includes(body.paymentMethod) ? body.paymentMethod : "",
    notes: str(body.notes, 2000),
    jobCardId: isId(body.jobCardId) ? body.jobCardId : null,
    ...(await linkFields(body)),
  };
}

export const plain = d => JSON.parse(JSON.stringify(d));
