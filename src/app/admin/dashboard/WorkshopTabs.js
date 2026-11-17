"use client";

// Admin: job cards and invoices. Customers see the ones linked to their account.
import { useCallback, useEffect, useMemo, useState } from "react";
import "./workshop.css";

const JOB_STATUSES = [
  ["open", "Open"],
  ["in_progress", "In progress"],
  ["completed", "Completed"],
  ["delivered", "Delivered"],
];
const INVOICE_STATUSES = [
  ["unpaid", "Unpaid"],
  ["paid", "Paid"],
  ["cancelled", "Cancelled"],
];
const PAYMENT_METHODS = [
  ["", "—"],
  ["cash", "Cash"],
  ["upi", "UPI"],
  ["card", "Card"],
  ["bank transfer", "Bank transfer"],
];
const label = (list, v) => (list.find(([k]) => k === v) || [, v])[1];
export const inr = n =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function api(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    window.location.href = "/admin-login";
    throw new Error("Signed out");
  }
  if (!res.ok || data.success === false) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

const emptyCustomer = { name: "", phone: "", email: "" };
const emptyVehicle = { brand: "", model: "", regNo: "", odometer: "", fuel: "" };
const today = () => new Date().toISOString().slice(0, 10);

// Booking → starting values for a new job card.
export function jobCardFromBooking(b) {
  const services = [b.serviceName, ...(b.additionalServices || []).map(s => s.name)].filter(Boolean);
  return {
    bookingId: b._id,
    userId: b.userId || null,
    customer: { name: b.name || "", phone: b.phone || "", email: b.email || "" },
    vehicle: { ...emptyVehicle, brand: b.vehicleBrand || "", model: b.vehicleModel || "" },
    complaints: b.notes || "",
    pickup: b.pickup?.required ? { ...b.pickup } : { required: false },
    workItems: services.map(s => ({ description: s, done: false })),
    parts: [],
    technician: "",
    status: "open",
    expectedDelivery: "",
    notes: "",
  };
}

function invoiceFromJobCard(j) {
  return {
    jobCardId: j._id,
    bookingId: j.bookingId || null,
    userId: j.userId || null,
    customer: { ...j.customer },
    vehicle: { ...j.vehicle },
    date: today(),
    items: [
      ...(j.workItems || []).map(w => ({ description: w.description, type: "labour", qty: 1, rate: 0 })),
      ...(j.parts || []).map(p => ({ description: p.name, type: "part", qty: p.qty || 1, rate: 0 })),
    ],
    discount: 0,
    taxRate: 18,
    status: "unpaid",
    paymentMethod: "",
    notes: "",
  };
}

// ── Shared form pieces ─────────────────────────────────────────────────────
function Field({ label, children, wide }) {
  return (
    <label className={`ws-field${wide ? " ws-wide" : ""}`}>
      <span className="form-label">{label}</span>
      {children}
    </label>
  );
}

function CustomerFields({ value, onChange }) {
  const set = patch => onChange({ ...value, ...patch });
  return (
    <div className="ws-grid">
      <Field label="Customer name *">
        <input className="form-input" value={value.name} onChange={e => set({ name: e.target.value })} required />
      </Field>
      <Field label="Phone">
        <input className="form-input" value={value.phone} onChange={e => set({ phone: e.target.value })} />
      </Field>
      <Field label="Email">
        <input className="form-input" type="email" value={value.email} onChange={e => set({ email: e.target.value })} />
      </Field>
    </div>
  );
}

function VehicleFields({ value, onChange }) {
  const set = patch => onChange({ ...value, ...patch });
  return (
    <div className="ws-grid">
      <Field label="Brand">
        <input className="form-input" value={value.brand} onChange={e => set({ brand: e.target.value })} />
      </Field>
      <Field label="Model">
        <input className="form-input" value={value.model} onChange={e => set({ model: e.target.value })} />
      </Field>
      <Field label="Registration no.">
        <input className="form-input" value={value.regNo} onChange={e => set({ regNo: e.target.value.toUpperCase() })} placeholder="AP07AB1234" />
      </Field>
      <Field label="Odometer (km)">
        <input className="form-input" value={value.odometer} onChange={e => set({ odometer: e.target.value })} />
      </Field>
      <Field label="Fuel level">
        <select className="form-select" value={value.fuel} onChange={e => set({ fuel: e.target.value })}>
          {["", "Empty", "1/4", "1/2", "3/4", "Full"].map(f => (
            <option key={f} value={f}>{f || "—"}</option>
          ))}
        </select>
      </Field>
    </div>
  );
}

// Link the document to a customer account so it shows in their "My account".
function AccountLink({ userId, customer, onChange }) {
  const [linked, setLinked] = useState(null);
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);

  useEffect(() => {
    let alive = true;
    if (!userId) return setLinked(null);
    api(`/api/admin/customers?id=${userId}`).then(d => alive && setLinked(d.customers[0] || null)).catch(() => {});
    return () => {
      alive = false;
    };
  }, [userId]);

  const search = async text => {
    setQ(text);
    if (text.trim().length < 2) return setResults([]);
    try {
      setResults((await api(`/api/admin/customers?q=${encodeURIComponent(text.trim())}`)).customers);
    } catch {}
  };

  return (
    <div className="ws-account">
      <span className="form-label">Customer account (shows this in their “My account”)</span>
      {userId && linked ? (
        <div className="ws-linked">
          <span>
            ✓ Linked to <strong>{linked.name}</strong> · {linked.email}
            {linked.phone ? ` · ${linked.phone}` : ""}
          </span>
          <button type="button" className="btn-cancel ws-small" onClick={() => onChange(null)}>
            Unlink
          </button>
        </div>
      ) : (
        <>
          <input
            className="form-input"
            value={q}
            onChange={e => search(e.target.value)}
            placeholder={`Search accounts by name, email or phone${customer?.email ? ` (e.g. ${customer.email})` : ""}`}
          />
          {results.length > 0 && (
            <div className="ws-results">
              {results.map(u => (
                <button
                  type="button"
                  key={u._id}
                  className="ws-result"
                  onClick={() => {
                    onChange(u._id);
                    setQ("");
                    setResults([]);
                  }}
                >
                  <strong>{u.name}</strong> · {u.email} {u.phone && `· ${u.phone}`}
                </button>
              ))}
            </div>
          )}
          <p className="ws-hint">Not linked — the customer won’t see it online until you link their account.</p>
        </>
      )}
    </div>
  );
}

function Rows({ rows, onChange, columns, make, addLabel }) {
  const update = (i, patch) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <div className="ws-rows">
      {rows.map((r, i) => (
        <div key={i} className="ws-row">
          {columns(r, patch => update(i, patch))}
          <button type="button" className="btn-delete ws-small" onClick={() => onChange(rows.filter((_, j) => j !== i))} aria-label="Remove row">
            ✕
          </button>
        </div>
      ))}
      <button type="button" className="btn-edit ws-small" onClick={() => onChange([...rows, make()])}>
        + {addLabel}
      </button>
    </div>
  );
}

// ── Job cards ───────────────────────────────────────────────────────────────
function JobCardForm({ initial, onSaved, onCancel, setMessage }) {
  const [f, setF] = useState(initial);
  const [saving, setSaving] = useState(false);
  const set = patch => setF(x => ({ ...x, ...patch }));

  const submit = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      const { item } = await api("/api/admin/job-cards", { method: f._id ? "PUT" : "POST", body: f });
      setMessage(`✅ Job card ${item.number} saved`);
      onSaved(item);
    } catch (err) {
      setMessage("❌ " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="form-card ws-form" onSubmit={submit}>
      <h3 className="form-title">{f._id ? `Edit job card ${f.number}` : "New job card"}</h3>
      <h4 className="ws-h">Customer</h4>
      <CustomerFields value={f.customer} onChange={customer => set({ customer })} />
      <AccountLink userId={f.userId} customer={f.customer} onChange={userId => set({ userId })} />
      <h4 className="ws-h">Vehicle</h4>
      <VehicleFields value={f.vehicle} onChange={vehicle => set({ vehicle })} />
      <label className="ws-check" style={{ marginTop: "0.25rem" }}>
        <input
          type="checkbox"
          checked={!!f.pickup?.required}
          onChange={e => set({ pickup: e.target.checked ? { required: true, address: f.pickup?.address || "", landmark: f.pickup?.landmark || "" } : { required: false } })}
        />{" "}
        Home pickup
      </label>
      {f.pickup?.required && (
        <div className="ws-grid">
          <Field label="Pickup address" wide>
            <input className="form-input" value={f.pickup.address || ""} onChange={e => set({ pickup: { ...f.pickup, address: e.target.value } })} />
          </Field>
          <Field label="Landmark">
            <input className="form-input" value={f.pickup.landmark || ""} onChange={e => set({ pickup: { ...f.pickup, landmark: e.target.value } })} />
          </Field>
        </div>
      )}
      <h4 className="ws-h">Job</h4>
      <Field label="Customer complaints / reported issues" wide>
        <textarea className="form-textarea" rows={3} value={f.complaints} onChange={e => set({ complaints: e.target.value })} />
      </Field>
      <span className="form-label">Work to do</span>
      <Rows
        rows={f.workItems}
        onChange={workItems => set({ workItems })}
        make={() => ({ description: "", done: false })}
        addLabel="Add work item"
        columns={(r, up) => (
          <>
            <input className="form-input" value={r.description} onChange={e => up({ description: e.target.value })} placeholder="e.g. Engine oil & filter change" />
            <label className="ws-check">
              <input type="checkbox" checked={r.done} onChange={e => up({ done: e.target.checked })} /> Done
            </label>
          </>
        )}
      />
      <span className="form-label">Parts used</span>
      <Rows
        rows={f.parts}
        onChange={parts => set({ parts })}
        make={() => ({ name: "", qty: 1 })}
        addLabel="Add part"
        columns={(r, up) => (
          <>
            <input className="form-input" value={r.name} onChange={e => up({ name: e.target.value })} placeholder="Part name" />
            <input className="form-input ws-qty" type="number" min="0" step="any" value={r.qty} onChange={e => up({ qty: e.target.value })} aria-label="Quantity" />
          </>
        )}
      />
      <div className="ws-grid">
        <Field label="Technician">
          <input className="form-input" value={f.technician} onChange={e => set({ technician: e.target.value })} />
        </Field>
        <Field label="Status">
          <select className="form-select" value={f.status} onChange={e => set({ status: e.target.value })}>
            {JOB_STATUSES.map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </Field>
        <Field label="Expected delivery">
          <input className="form-input" type="date" value={f.expectedDelivery} onChange={e => set({ expectedDelivery: e.target.value })} />
        </Field>
      </div>
      <Field label="Notes (visible to the customer)" wide>
        <textarea className="form-textarea" rows={2} value={f.notes} onChange={e => set({ notes: e.target.value })} />
      </Field>
      <div className="form-actions">
        <button type="submit" disabled={saving} className="btn-primary" style={{ flex: 1 }}>
          {saving ? "Saving…" : "Save job card"}
        </button>
        <button type="button" onClick={onCancel} className="btn-cancel">
          Cancel
        </button>
      </div>
    </form>
  );
}

const NEXT_STATUS = { open: "in_progress", in_progress: "completed", completed: "delivered" };

export function JobCardsTab({ draft, clearDraft, onCreateInvoice, setMessage, canDelete = true, defaultView = "list", onChanged }) {
  const [items, setItems] = useState(null);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [view, setView] = useState(defaultView); // list | board
  const [moving, setMoving] = useState(null);

  // One tap: Open → In progress → Completed → Delivered.
  const advance = async j => {
    const next = NEXT_STATUS[j.status];
    if (!next) return;
    setMoving(j._id);
    try {
      const { item } = await api("/api/admin/job-cards", { method: "PUT", body: { ...j, status: next } });
      setItems(list => list.map(x => (x._id === item._id ? item : x)));
      setMessage(`✅ ${j.number} → ${label(JOB_STATUSES, next)}`);
      onChanged?.();
    } catch (e) {
      setMessage("❌ " + e.message);
    } finally {
      setMoving(null);
    }
  };

  const load = useCallback(async () => {
    try {
      setItems((await api("/api/admin/job-cards")).items);
    } catch (e) {
      setMessage("❌ " + e.message);
      setItems([]);
    }
  }, [setMessage]);

  useEffect(() => {
    let alive = true;
    api("/api/admin/job-cards")
      .then(d => alive && setItems(d.items))
      .catch(() => alive && setItems([]));
    return () => {
      alive = false;
    };
  }, []);

  // A booking's "Create job card" button opens the form pre-filled.
  useEffect(() => {
    if (draft) {
      setEditing(draft); // eslint-disable-line react-hooks/set-state-in-effect
      clearDraft();
    }
  }, [draft, clearDraft]);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (items || []).filter(
      j =>
        (filter === "all" || j.status === filter) &&
        (!t || [j.number, j.customer?.name, j.customer?.phone, j.vehicle?.regNo, j.vehicle?.model].join(" ").toLowerCase().includes(t))
    );
  }, [items, filter, q]);

  const remove = async j => {
    if (!confirm(`Delete job card ${j.number}? This cannot be undone.`)) return;
    try {
      await api(`/api/admin/job-cards?id=${j._id}`, { method: "DELETE" });
      setMessage("✅ Job card deleted");
      load();
      onChanged?.();
    } catch (e) {
      setMessage("❌ " + e.message);
    }
  };

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">Job Cards</h2>
          <p className="section-subtitle">Work orders for cars in the workshop</p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() =>
            setEditing({ customer: emptyCustomer, vehicle: emptyVehicle, complaints: "", workItems: [], parts: [], technician: "", status: "open", expectedDelivery: "", notes: "", userId: null })
          }
        >
          + New job card
        </button>
      </div>

      {editing && (
        <JobCardForm
          key={editing._id || "new"}
          initial={editing}
          setMessage={setMessage}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
            onChanged?.();
          }}
        />
      )}

      <div className="ws-toolbar">
        <input className="form-input" value={q} onChange={e => setQ(e.target.value)} placeholder="Search number, customer, phone, reg. no." />
        {view === "list" && (
          <select className="form-select" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All statuses</option>
            {JOB_STATUSES.map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        )}
        <div className="ws-seg" role="tablist" aria-label="View">
          {[
            ["board", "Flow"],
            ["list", "List"],
          ].map(([k, v]) => (
            <button key={k} type="button" role="tab" aria-selected={view === k} className={view === k ? "on" : ""} onClick={() => setView(k)}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {items === null ? (
        <p className="text-gray">Loading…</p>
      ) : view === "board" ? (
        <div className="ws-board">
          {JOB_STATUSES.map(([status, title]) => {
            const col = shown.filter(j => j.status === status);
            return (
              <section key={status} className="ws-col">
                <h3 className="ws-col-title">
                  <span className={`ws-dot ws-${status}`} /> {title} <span className="ws-col-count">{col.length}</span>
                </h3>
                {col.length === 0 && <p className="ws-empty">Nothing here</p>}
                {col.map(j => (
                  <JobCardTile key={j._id} j={j} onEdit={() => setEditing(j)} onAdvance={() => advance(j)} moving={moving === j._id} compact />
                ))}
              </section>
            );
          })}
        </div>
      ) : shown.length === 0 ? (
        <p className="text-gray">No job cards yet. Create one here or from a booking.</p>
      ) : (
        <div className="ws-list">
          {shown.map(j => (
            <JobCardTile
              key={j._id}
              j={j}
              onEdit={() => setEditing(j)}
              onAdvance={() => advance(j)}
              moving={moving === j._id}
              onInvoice={onCreateInvoice ? () => onCreateInvoice(invoiceFromJobCard(j)) : null}
              onDelete={canDelete ? () => remove(j) : null}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function JobCardTile({ j, onEdit, onAdvance, moving, onInvoice, onDelete, compact }) {
  const next = NEXT_STATUS[j.status];
  const done = (j.workItems || []).filter(w => w.done).length;
  const total = (j.workItems || []).length;
  return (
    <div className={`card ws-item ws-tile${compact ? " ws-compact" : ""}`}>
      <div className="ws-item-top">
        <strong>{j.number}</strong>
        <span className={`ws-badge ws-${j.status}`}>{label(JOB_STATUSES, j.status)}</span>
      </div>
      <p className="booking-value">{j.customer?.name}</p>
      <p className="text-gray text-sm">
        {[j.vehicle?.brand, j.vehicle?.model].filter(Boolean).join(" ")} {j.vehicle?.regNo && `· ${j.vehicle.regNo}`}
      </p>
      {j.pickup?.required && <p className="ws-pickup">🚗 Home pickup · {j.pickup.address}</p>}
      {total > 0 && (
        <div className="ws-progress" title={`${done} of ${total} jobs done`}>
          <span style={{ width: `${(done / total) * 100}%` }} />
        </div>
      )}
      <p className="text-gray text-sm">
        {done}/{total} done{j.expectedDelivery ? ` · due ${j.expectedDelivery}` : ""}
        {!compact && ` · ${j.userId ? "Linked" : "Not linked"}`}
      </p>
      <div className="card-actions">
        {next && (
          <button type="button" className="btn-accept ws-auto" onClick={onAdvance} disabled={moving}>
            {moving ? "…" : `→ ${label(JOB_STATUSES, next)}`}
          </button>
        )}
        <button type="button" className="btn-edit" onClick={onEdit}>Edit</button>
        <a className="btn-edit ws-a" href={`/admin/print/job-card/${j._id}`} target="_blank" rel="noreferrer">Print</a>
        {onInvoice && <button type="button" className="btn-edit ws-auto" onClick={onInvoice}>Invoice</button>}
        {onDelete && <button type="button" className="btn-delete" onClick={onDelete}>Delete</button>}
      </div>
    </div>
  );
}

// ── Invoices ────────────────────────────────────────────────────────────────
function totals(items, discount, taxRate) {
  const subtotal = items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.rate) || 0), 0);
  const disc = Math.min(Math.max(Number(discount) || 0, 0), subtotal);
  const tax = ((subtotal - disc) * (Number(taxRate) || 0)) / 100;
  return { subtotal, discount: disc, tax, total: subtotal - disc + tax };
}

function InvoiceForm({ initial, onSaved, onCancel, setMessage }) {
  const [f, setF] = useState(initial);
  const [saving, setSaving] = useState(false);
  const set = patch => setF(x => ({ ...x, ...patch }));
  const t = totals(f.items, f.discount, f.taxRate);

  const submit = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      const { item } = await api("/api/admin/invoices", { method: f._id ? "PUT" : "POST", body: f });
      setMessage(`✅ Invoice ${item.number} saved`);
      onSaved(item);
    } catch (err) {
      setMessage("❌ " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="form-card ws-form" onSubmit={submit}>
      <h3 className="form-title">{f._id ? `Edit invoice ${f.number}` : "New invoice"}</h3>
      <h4 className="ws-h">Customer</h4>
      <CustomerFields value={f.customer} onChange={customer => set({ customer })} />
      <AccountLink userId={f.userId} customer={f.customer} onChange={userId => set({ userId })} />
      <h4 className="ws-h">Vehicle</h4>
      <VehicleFields value={f.vehicle} onChange={vehicle => set({ vehicle })} />
      <h4 className="ws-h">Items</h4>
      <Rows
        rows={f.items}
        onChange={items => set({ items })}
        make={() => ({ description: "", type: "labour", qty: 1, rate: 0 })}
        addLabel="Add item"
        columns={(r, up) => (
          <>
            <input className="form-input" value={r.description} onChange={e => up({ description: e.target.value })} placeholder="Description" />
            <select className="form-select ws-type" value={r.type} onChange={e => up({ type: e.target.value })}>
              <option value="labour">Labour</option>
              <option value="part">Part</option>
            </select>
            <input className="form-input ws-qty" type="number" min="0" step="any" value={r.qty} onChange={e => up({ qty: e.target.value })} aria-label="Quantity" />
            <input className="form-input ws-rate" type="number" min="0" step="any" value={r.rate} onChange={e => up({ rate: e.target.value })} aria-label="Rate (₹)" placeholder="Rate ₹" />
            <span className="ws-amount">{inr((Number(r.qty) || 0) * (Number(r.rate) || 0))}</span>
          </>
        )}
      />
      <div className="ws-grid">
        <Field label="Invoice date">
          <input className="form-input" type="date" value={f.date} onChange={e => set({ date: e.target.value })} />
        </Field>
        <Field label="Discount (₹)">
          <input className="form-input" type="number" min="0" step="any" value={f.discount} onChange={e => set({ discount: e.target.value })} />
        </Field>
        <Field label="GST (%)">
          <input className="form-input" type="number" min="0" step="any" value={f.taxRate} onChange={e => set({ taxRate: e.target.value })} />
        </Field>
        <Field label="Status">
          <select className="form-select" value={f.status} onChange={e => set({ status: e.target.value })}>
            {INVOICE_STATUSES.map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </Field>
        <Field label="Payment method">
          <select className="form-select" value={f.paymentMethod} onChange={e => set({ paymentMethod: e.target.value })}>
            {PAYMENT_METHODS.map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </Field>
      </div>
      <div className="ws-totals">
        <span>Subtotal</span><span>{inr(t.subtotal)}</span>
        <span>Discount</span><span>− {inr(t.discount)}</span>
        <span>GST {Number(f.taxRate) || 0}%</span><span>{inr(t.tax)}</span>
        <strong>Total</strong><strong>{inr(t.total)}</strong>
      </div>
      <Field label="Notes (printed on the invoice)" wide>
        <textarea className="form-textarea" rows={2} value={f.notes} onChange={e => set({ notes: e.target.value })} />
      </Field>
      <div className="form-actions">
        <button type="submit" disabled={saving} className="btn-primary" style={{ flex: 1 }}>
          {saving ? "Saving…" : "Save invoice"}
        </button>
        <button type="button" onClick={onCancel} className="btn-cancel">
          Cancel
        </button>
      </div>
    </form>
  );
}

export function InvoicesTab({ draft, clearDraft, setMessage }) {
  const [items, setItems] = useState(null);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    try {
      setItems((await api("/api/admin/invoices")).items);
    } catch (e) {
      setMessage("❌ " + e.message);
      setItems([]);
    }
  }, [setMessage]);

  useEffect(() => {
    let alive = true;
    api("/api/admin/invoices")
      .then(d => alive && setItems(d.items))
      .catch(() => alive && setItems([]));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (draft) {
      setEditing(draft); // eslint-disable-line react-hooks/set-state-in-effect
      clearDraft();
    }
  }, [draft, clearDraft]);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (items || []).filter(
      i =>
        (filter === "all" || i.status === filter) &&
        (!t || [i.number, i.customer?.name, i.customer?.phone, i.vehicle?.regNo].join(" ").toLowerCase().includes(t))
    );
  }, [items, filter, q]);

  const unpaid = (items || []).filter(i => i.status === "unpaid").reduce((s, i) => s + (i.total || 0), 0);

  const markPaid = async i => {
    const method = prompt("Payment method (cash, upi, card, bank transfer):", i.paymentMethod || "cash");
    if (method === null) return;
    try {
      await api("/api/admin/invoices", { method: "PUT", body: { ...i, status: "paid", paymentMethod: method.trim().toLowerCase() } });
      setMessage(`✅ ${i.number} marked as paid`);
      load();
    } catch (e) {
      setMessage("❌ " + e.message);
    }
  };

  const remove = async i => {
    if (!confirm(`Delete invoice ${i.number}? This cannot be undone. (To keep a record, set it to Cancelled instead.)`)) return;
    try {
      await api(`/api/admin/invoices?id=${i._id}`, { method: "DELETE" });
      setMessage("✅ Invoice deleted");
      load();
    } catch (e) {
      setMessage("❌ " + e.message);
    }
  };

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">Invoices</h2>
          <p className="section-subtitle">Unpaid total: {inr(unpaid)}</p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() =>
            setEditing({ customer: emptyCustomer, vehicle: emptyVehicle, date: today(), items: [{ description: "", type: "labour", qty: 1, rate: 0 }], discount: 0, taxRate: 18, status: "unpaid", paymentMethod: "", notes: "", userId: null })
          }
        >
          + New invoice
        </button>
      </div>

      {editing && (
        <InvoiceForm
          key={editing._id || "new"}
          initial={editing}
          setMessage={setMessage}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}

      <div className="ws-toolbar">
        <input className="form-input" value={q} onChange={e => setQ(e.target.value)} placeholder="Search number, customer, phone, reg. no." />
        <select className="form-select" value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">All statuses</option>
          {INVOICE_STATUSES.map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {items === null ? (
        <p className="text-gray">Loading…</p>
      ) : shown.length === 0 ? (
        <p className="text-gray">No invoices yet. Create one here or from a job card.</p>
      ) : (
        <div className="ws-list">
          {shown.map(i => (
            <div key={i._id} className="card ws-item">
              <div className="ws-item-top">
                <strong>{i.number}</strong>
                <span className={`ws-badge ws-${i.status}`}>{label(INVOICE_STATUSES, i.status)}</span>
              </div>
              <p className="booking-value">{i.customer?.name}</p>
              <p className="ws-total">{inr(i.total)}</p>
              <p className="text-gray text-sm">
                {i.date} · {[i.vehicle?.model, i.vehicle?.regNo].filter(Boolean).join(" · ")}
              </p>
              <p className="text-gray text-sm">{i.userId ? "Linked to account" : "Not linked"}</p>
              <div className="card-actions">
                <button type="button" className="btn-edit" onClick={() => setEditing(i)}>Edit</button>
                <a className="btn-edit ws-a" href={`/admin/print/invoice/${i._id}`} target="_blank" rel="noreferrer">Print</a>
                {i.status === "unpaid" && (
                  <button type="button" className="btn-accept ws-auto" onClick={() => markPaid(i)}>Paid</button>
                )}
                <button type="button" className="btn-delete" onClick={() => remove(i)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
