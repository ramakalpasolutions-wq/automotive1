"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

const inr = n => "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = d => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "");
const JOB = { open: ["Open", "bg-amber-100 text-amber-800"], in_progress: ["In progress", "bg-blue-100 text-blue-800"], completed: ["Ready", "bg-green-100 text-green-800"], delivered: ["Delivered", "bg-gray-200 text-gray-700"] };
const INV = { unpaid: ["Unpaid", "bg-amber-100 text-amber-800"], paid: ["Paid", "bg-green-100 text-green-800"] };
const input = "w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-gray-900 outline-none focus:border-gray-900";

async function call(url, method = "GET", body) {
  const res = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    window.location.href = "/account/login?next=/account";
    throw new Error("Please sign in again.");
  }
  if (!res.ok || data.success === false) throw new Error(data.error || "Something went wrong.");
  return data;
}

function Badge({ map, value }) {
  const [text, cls] = map[value] || [value, "bg-gray-100 text-gray-700"];
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{text}</span>;
}

export default function AccountPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("bookings");
  const [editing, setEditing] = useState(null); // null | profile | password

  const load = useCallback(async () => {
    try {
      setData(await call("/api/account/overview"));
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    call("/api/account/overview")
      .then(d => alive && setData(d))
      .catch(e => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, []);

  const signOut = async () => {
    await fetch("/api/account/logout", { method: "POST" });
    window.dispatchEvent(new Event("accountChanged"));
    window.location.href = "/";
  };

  const deleteAccount = async () => {
    if (!confirm("Delete your account? Your login and saved details will be removed. This cannot be undone. Past service records stay with the workshop.")) return;
    try {
      await call("/api/app/me", "DELETE");
      await fetch("/api/account/logout", { method: "POST" });
      window.location.href = "/";
    } catch (e) {
      alert(e.message);
    }
  };

  if (!data) {
    return <main className="px-4 py-20 text-center text-gray-600">{error || "Loading your account…"}</main>;
  }

  const { user, bookings, jobCards, invoices } = data;
  const due = invoices.filter(i => i.status === "unpaid").reduce((s, i) => s + (i.total || 0), 0);
  const tabs = [
    ["bookings", "Bookings", bookings.length],
    ["jobcards", "Job cards", jobCards.length],
    ["invoices", "Invoices", invoices.length],
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="anim-fade-up flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 sm:flex-row sm:items-center">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gray-900 text-2xl font-bold text-white">
          {(user.name || "?").trim()[0]?.toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
          <p className="truncate text-gray-600">
            {user.email}
            {user.phone && ` · ${user.phone}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/booking" className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700">
            Book a service
          </Link>
          <button type="button" onClick={() => setEditing(editing === "profile" ? null : "profile")} className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50">
            Edit profile
          </button>
          <button type="button" onClick={() => setEditing(editing === "password" ? null : "password")} className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50">
            Password
          </button>
          <button type="button" onClick={signOut} className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50">
            Sign out
          </button>
        </div>
      </div>

      {editing === "profile" && <EditProfile user={user} onDone={() => { setEditing(null); load(); window.dispatchEvent(new Event("accountChanged")); }} />}
      {editing === "password" && <ChangePassword onDone={() => setEditing(null)} />}

      {due > 0 && (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          You have <strong>{inr(due)}</strong> unpaid. Please pay at the workshop or call us.
        </div>
      )}

      <div className="anim-fade-up anim-delay-1 mt-8 flex gap-2 overflow-x-auto border-b border-gray-200" role="tablist">
        {tabs.map(([k, v, n]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold ${tab === k ? "border-gray-900 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-800"}`}
          >
            {v} <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{n}</span>
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {tab === "bookings" &&
          (bookings.length === 0 ? (
            <Empty text="No bookings yet." action={<Link href="/booking" className="font-semibold text-red-600 hover:underline">Book a service →</Link>} />
          ) : (
            bookings.map(b => {
              const services = [b.serviceName || b.service, ...(b.additionalServices || []).map(s => s.name)].filter(Boolean);
              return (
                <div key={b._id} className="anim-fade-up anim-lift rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="text-gray-900">{b.vehicleBrand} {b.vehicleModel}</strong>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${b.status === "confirmed" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                      {b.status === "confirmed" ? "Confirmed" : "Pending"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">{fmtDate(b.bookingDate)} · {b.bookingTime}</p>
                  <p className="mt-1 text-sm text-gray-700">{services.join(", ")}</p>
                </div>
              );
            })
          ))}

        {tab === "jobcards" &&
          (jobCards.length === 0 ? (
            <Empty text="No job cards yet. When your car is in the workshop, its job card appears here." />
          ) : (
            jobCards.map(j => {
              const done = (j.workItems || []).filter(w => w.done).length;
              return (
                <Link key={j._id} href={`/account/job-card/${j._id}`} className="anim-fade-up anim-lift block rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200 hover:ring-gray-400">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="text-gray-900">{j.number}</strong>
                    <Badge map={JOB} value={j.status} />
                  </div>
                  <p className="mt-1 text-sm text-gray-700">
                    {[j.vehicle?.brand, j.vehicle?.model].filter(Boolean).join(" ")} {j.vehicle?.regNo && `· ${j.vehicle.regNo}`}
                  </p>
                  <p className="mt-1 text-sm text-gray-600">
                    Opened {fmtDate(j.createdAt)} · {done}/{(j.workItems || []).length} jobs done
                    {j.expectedDelivery && ` · Expected ${fmtDate(j.expectedDelivery)}`}
                  </p>
                </Link>
              );
            })
          ))}

        {tab === "invoices" &&
          (invoices.length === 0 ? (
            <Empty text="No invoices yet." />
          ) : (
            invoices.map(i => (
              <Link key={i._id} href={`/account/invoice/${i._id}`} className="anim-fade-up anim-lift flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200 hover:ring-gray-400">
                <div>
                  <strong className="text-gray-900">{i.number}</strong>
                  <p className="text-sm text-gray-600">
                    {fmtDate(i.date)} · {[i.vehicle?.model, i.vehicle?.regNo].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <strong className="text-lg text-gray-900">{inr(i.total)}</strong>
                  <Badge map={INV} value={i.status} />
                </div>
              </Link>
            ))
          ))}
      </div>

      <div className="mt-12 text-center">
        <button type="button" onClick={deleteAccount} className="text-sm font-semibold text-red-600 hover:underline">
          Delete my account
        </button>
      </div>
    </main>
  );
}

function Empty({ text, action }) {
  return (
    <div className="rounded-2xl bg-white p-8 text-center text-gray-600 shadow-sm ring-1 ring-gray-200">
      <p>{text}</p>
      {action && <p className="mt-3">{action}</p>}
    </div>
  );
}

function EditProfile({ user, onDone }) {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const save = async e => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await call("/api/app/me", "PATCH", { name, phone });
      onDone();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };
  return (
    <form onSubmit={save} className="mt-4 grid gap-3 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 sm:grid-cols-3">
      <input className={input} value={name} onChange={e => setName(e.target.value)} placeholder="Full name" required />
      <input className={input} value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone" type="tel" />
      <button disabled={busy} className="rounded-xl bg-gray-900 px-4 py-2.5 font-semibold text-white disabled:opacity-60">{busy ? "Saving…" : "Save"}</button>
      {error && <p className="text-sm text-red-600 sm:col-span-3">{error}</p>}
    </form>
  );
}

function ChangePassword({ onDone }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const save = async e => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      // Changing the password signs out other devices; sign this browser back in.
      const res = await call("/api/app/me", "PATCH", { currentPassword: current, newPassword: next });
      if (res.user) await call("/api/account/login", "POST", { email: res.user.email, password: next });
      alert("Password changed. Other devices have been signed out.");
      onDone();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };
  return (
    <form onSubmit={save} className="mt-4 grid gap-3 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 sm:grid-cols-3">
      <input className={input} type="password" value={current} onChange={e => setCurrent(e.target.value)} placeholder="Current password" autoComplete="current-password" required />
      <input className={input} type="password" value={next} onChange={e => setNext(e.target.value)} placeholder="New password (8+ characters)" autoComplete="new-password" minLength={8} required />
      <button disabled={busy} className="rounded-xl bg-gray-900 px-4 py-2.5 font-semibold text-white disabled:opacity-60">{busy ? "Saving…" : "Change password"}</button>
      {error && <p className="text-sm text-red-600 sm:col-span-3">{error}</p>}
    </form>
  );
}
