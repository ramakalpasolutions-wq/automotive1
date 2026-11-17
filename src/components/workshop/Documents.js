// Printable invoice and job card (used by the admin panel and the customer's account).
import { SITE } from "@/lib/site";

export const inr = n =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = d => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "");
const JOB_STATUS = { open: "Open", in_progress: "In progress", completed: "Completed", delivered: "Delivered" };
const GSTIN = process.env.NEXT_PUBLIC_GSTIN || "";

const PRINT_CSS = `
.doc { background:#fff; color:#111827; max-width:820px; margin:0 auto; padding:40px; border:1px solid #e5e7eb; border-radius:12px; font-size:14px; line-height:1.5 }
.doc h1 { font-size:26px; margin:0; letter-spacing:.04em }
.doc-head { display:flex; justify-content:space-between; gap:24px; border-bottom:2px solid #111827; padding-bottom:16px; margin-bottom:20px }
.doc-biz strong { font-size:18px } .doc-muted { color:#6b7280 }
.doc-cols { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px }
.doc-box { border:1px solid #e5e7eb; border-radius:8px; padding:12px }
.doc-box h3 { font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:#6b7280; margin:0 0 6px }
.doc table { width:100%; border-collapse:collapse; margin-bottom:16px }
.doc th { text-align:left; font-size:11px; letter-spacing:.06em; text-transform:uppercase; color:#6b7280; border-bottom:1px solid #d1d5db; padding:8px 6px }
.doc td { border-bottom:1px solid #f3f4f6; padding:8px 6px; vertical-align:top }
.doc .num { text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap }
.doc-totals { margin-left:auto; width:280px; display:grid; grid-template-columns:1fr auto; gap:6px 16px; font-variant-numeric:tabular-nums }
.doc-totals .grand { font-size:18px; font-weight:800; border-top:2px solid #111827; padding-top:8px }
.doc-stamp { display:inline-block; padding:4px 12px; border-radius:999px; font-weight:700; font-size:12px; letter-spacing:.06em }
.doc-paid { background:#dcfce7; color:#166534 } .doc-unpaid { background:#fef3c7; color:#92400e } .doc-cancelled { background:#fee2e2; color:#991b1b }
.doc-foot { margin-top:28px; padding-top:12px; border-top:1px solid #e5e7eb; color:#6b7280; font-size:12px }
.doc-sign { display:flex; justify-content:space-between; margin-top:48px; color:#6b7280; font-size:12px }
.doc-sign span { border-top:1px solid #9ca3af; padding-top:6px; min-width:180px; text-align:center }
.doc ul { margin:0; padding-left:18px }
@media (max-width:640px) { .doc { padding:20px } .doc-cols, .doc-head { grid-template-columns:1fr; flex-direction:column } }
@media print {
  @page { margin:12mm }
  body * { visibility:hidden }
  .doc, .doc * { visibility:visible }
  .doc { position:absolute; left:0; top:0; width:100%; max-width:none; border:none; padding:0 }
  .no-print { display:none !important }
}`;

function Business() {
  return (
    <div className="doc-biz">
      <strong>{SITE.name}</strong>
      <div className="doc-muted">
        {SITE.city}, {SITE.region}
        <br />
        {SITE.phone.replace("+91-", "+91 ").replace(/-/g, " ")} · {SITE.email}
        {GSTIN && (
          <>
            <br />
            GSTIN: {GSTIN}
          </>
        )}
      </div>
    </div>
  );
}

function Parties({ doc }) {
  const v = doc.vehicle || {};
  const c = doc.customer || {};
  return (
    <div className="doc-cols">
      <div className="doc-box">
        <h3>Customer</h3>
        <strong>{c.name}</strong>
        {c.phone && <div>{c.phone}</div>}
        {c.email && <div>{c.email}</div>}
      </div>
      <div className="doc-box">
        <h3>Vehicle</h3>
        <strong>{[v.brand, v.model].filter(Boolean).join(" ") || "—"}</strong>
        {v.regNo && <div>Reg. no: {v.regNo}</div>}
        {v.odometer && <div>Odometer: {v.odometer} km</div>}
        {v.fuel && <div>Fuel: {v.fuel}</div>}
      </div>
      {doc.pickup?.required && (
        <div className="doc-box" style={{ gridColumn: "1 / -1" }}>
          <h3>Home pickup</h3>
          {doc.pickup.address}
          {doc.pickup.landmark ? ` (near ${doc.pickup.landmark})` : ""}
        </div>
      )}
    </div>
  );
}

export function InvoiceDocument({ invoice: i }) {
  return (
    <div className="doc">
      <style>{PRINT_CSS}</style>
      <div className="doc-head">
        <Business />
        <div style={{ textAlign: "right" }}>
          <h1>INVOICE</h1>
          <div>
            <strong>{i.number}</strong>
          </div>
          <div className="doc-muted">Date: {fmtDate(i.date)}</div>
          <div style={{ marginTop: 6 }}>
            <span className={`doc-stamp doc-${i.status}`}>{String(i.status).toUpperCase()}</span>
          </div>
        </div>
      </div>
      <Parties doc={i} />
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Description</th>
            <th>Type</th>
            <th className="num">Qty</th>
            <th className="num">Rate</th>
            <th className="num">Amount</th>
          </tr>
        </thead>
        <tbody>
          {(i.items || []).map((it, n) => (
            <tr key={n}>
              <td>{n + 1}</td>
              <td>{it.description}</td>
              <td>{it.type === "part" ? "Part" : "Labour"}</td>
              <td className="num">{it.qty}</td>
              <td className="num">{inr(it.rate)}</td>
              <td className="num">{inr(it.qty * it.rate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="doc-totals">
        <span>Subtotal</span>
        <span className="num">{inr(i.subtotal)}</span>
        {i.discount > 0 && (
          <>
            <span>Discount</span>
            <span className="num">− {inr(i.discount)}</span>
          </>
        )}
        {i.taxRate > 0 && (
          <>
            <span>GST ({i.taxRate}%)</span>
            <span className="num">{inr(i.tax)}</span>
          </>
        )}
        <span className="grand">Total</span>
        <span className="grand num">{inr(i.total)}</span>
      </div>
      {i.status === "paid" && i.paymentMethod && <p className="doc-muted">Paid by {i.paymentMethod.toUpperCase()}.</p>}
      {i.notes && <p style={{ whiteSpace: "pre-line" }}>{i.notes}</p>}
      <div className="doc-sign">
        <span>Customer signature</span>
        <span>For {SITE.name}</span>
      </div>
      <div className="doc-foot">Thank you for choosing {SITE.name}. This is a computer-generated invoice.</div>
    </div>
  );
}

export function JobCardDocument({ jobCard: j }) {
  return (
    <div className="doc">
      <style>{PRINT_CSS}</style>
      <div className="doc-head">
        <Business />
        <div style={{ textAlign: "right" }}>
          <h1>JOB CARD</h1>
          <div>
            <strong>{j.number}</strong>
          </div>
          <div className="doc-muted">Opened: {fmtDate(j.createdAt)}</div>
          {j.expectedDelivery && <div className="doc-muted">Expected delivery: {fmtDate(j.expectedDelivery)}</div>}
          <div style={{ marginTop: 6 }}>
            <span className="doc-stamp doc-unpaid">{(JOB_STATUS[j.status] || j.status).toUpperCase()}</span>
          </div>
        </div>
      </div>
      <Parties doc={j} />
      {j.complaints && (
        <div className="doc-box" style={{ marginBottom: 16 }}>
          <h3>Customer complaints</h3>
          <div style={{ whiteSpace: "pre-line" }}>{j.complaints}</div>
        </div>
      )}
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Work</th>
            <th className="num">Status</th>
          </tr>
        </thead>
        <tbody>
          {(j.workItems || []).length === 0 ? (
            <tr>
              <td colSpan={3} className="doc-muted">No work items yet.</td>
            </tr>
          ) : (
            j.workItems.map((w, n) => (
              <tr key={n}>
                <td>{n + 1}</td>
                <td>{w.description}</td>
                <td className="num">{w.done ? "✓ Done" : "Pending"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      {(j.parts || []).length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Part</th>
              <th className="num">Qty</th>
            </tr>
          </thead>
          <tbody>
            {j.parts.map((p, n) => (
              <tr key={n}>
                <td>{p.name}</td>
                <td className="num">{p.qty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {j.technician && <p>Technician: {j.technician}</p>}
      {j.notes && <p style={{ whiteSpace: "pre-line" }}>{j.notes}</p>}
      <div className="doc-sign">
        <span>Customer signature</span>
        <span>Service advisor</span>
      </div>
    </div>
  );
}
