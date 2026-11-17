"use client";

// Job card manager: today's appointments (with home pickups) and the job card flow.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import "../dashboard/styles.css";
import "../dashboard/workshop.css";
import "./manager.css";
import { JobCardsTab, jobCardFromBooking } from "../dashboard/WorkshopTabs";

const todayIST = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
const minutes = t => {
  const m = String(t || "").match(/(\d+):(\d+) (AM|PM)/);
  return m ? ((+m[1] % 12) + (m[3] === "PM" ? 12 : 0)) * 60 + +m[2] : 0;
};
const fmtDay = d =>
  new Date(d + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

const FILTERS = [
  ["today", "Today"],
  ["upcoming", "Upcoming"],
  ["pickup", "Pickups"],
  ["pending", "Unconfirmed"],
  ["all", "All"],
];

export default function ManagerPage() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [tab, setTab] = useState("appointments");
  const [bookings, setBookings] = useState(null);
  const [jobCards, setJobCards] = useState([]);
  const [filter, setFilter] = useState("today");
  const [message, setMessage] = useState("");
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(null);
  const clearDraft = useCallback(() => setDraft(null), []);

  const load = useCallback(async () => {
    const [b, j] = await Promise.all([
      fetch("/api/bookings").then(r => (r.ok ? r.json() : { bookings: [] })),
      fetch("/api/admin/job-cards").then(r => (r.ok ? r.json() : { items: [] })),
    ]);
    setBookings(b.bookings || []);
    setJobCards(j.items || []);
  }, []);

  useEffect(() => {
    let alive = true;
    fetch("/api/admin/me")
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!alive) return;
        if (!d) return router.push("/admin-login");
        setMe(d);
        load();
      })
      .catch(() => router.push("/admin-login"));
    return () => {
      alive = false;
    };
  }, [router, load]);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(""), 3500);
    return () => clearTimeout(t);
  }, [message]);

  const jobByBooking = useMemo(() => Object.fromEntries(jobCards.filter(j => j.bookingId).map(j => [j.bookingId, j])), [jobCards]);

  const shown = useMemo(() => {
    const today = todayIST();
    return (bookings || [])
      .filter(b => {
        if (filter === "today") return b.bookingDate === today;
        if (filter === "upcoming") return b.bookingDate >= today;
        if (filter === "pickup") return b.pickup?.required && b.bookingDate >= today;
        if (filter === "pending") return b.status !== "confirmed";
        return true;
      })
      .sort((a, b) =>
        filter === "all" ? (b.bookingDate || "").localeCompare(a.bookingDate || "") : (a.bookingDate || "").localeCompare(b.bookingDate || "") || minutes(a.bookingTime) - minutes(b.bookingTime)
      );
  }, [bookings, filter]);

  const counts = useMemo(() => {
    const today = todayIST();
    const list = bookings || [];
    return {
      today: list.filter(b => b.bookingDate === today).length,
      pickups: list.filter(b => b.pickup?.required && b.bookingDate >= today).length,
      pending: list.filter(b => b.status !== "confirmed").length,
      open: jobCards.filter(j => j.status !== "delivered").length,
    };
  }, [bookings, jobCards]);

  const confirm = async b => {
    if (!window.confirm(`Confirm ${b.name}'s booking on ${b.bookingDate} at ${b.bookingTime}? The customer gets an email.`)) return;
    setBusy(b._id);
    try {
      const res = await fetch("/api/bookings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: b._id, status: "confirmed" }),
      }).then(r => r.json());
      if (!res.success) throw new Error(res.error);
      setMessage(res.emailSent ? "✅ Confirmed — email sent" : "✅ Confirmed (email could not be sent)");
      setBookings(list => list.map(x => (x._id === b._id ? { ...x, status: "confirmed" } : x)));
    } catch (e) {
      setMessage("❌ " + e.message);
    } finally {
      setBusy(null);
    }
  };

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin-login");
  };

  if (!me) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="spinner" />
          <div className="loading-text">Loading…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-layout mg">
      <div className="admin-header">
        <div className="admin-header-content">
          <h1 className="admin-title">{me.level === "manager" ? "Job Card Manager" : "Manager view"}</h1>
          <div className="mg-head-actions">
            {me.level === "admin" && (
              <a className="logout-btn" href="/admin/dashboard" style={{ textDecoration: "none" }}>
                Admin dashboard
              </a>
            )}
            <button type="button" className="logout-btn" onClick={logout}>
              Logout
            </button>
          </div>
        </div>
      </div>

      <main className="mg-main">
        <div className="mg-stats">
          {[
            ["Today", counts.today, "📅"],
            ["Pickups ahead", counts.pickups, "🚗"],
            ["Unconfirmed", counts.pending, "⏳"],
            ["Cars in workshop", counts.open, "🔧"],
          ].map(([k, v, icon]) => (
            <div key={k} className="mg-stat">
              <span className="mg-stat-icon">{icon}</span>
              <span className="mg-stat-num">{v}</span>
              <span className="mg-stat-label">{k}</span>
            </div>
          ))}
        </div>

        <div className="mg-tabs" role="tablist">
          {[
            ["appointments", "Appointments"],
            ["flow", "Job card flow"],
          ].map(([k, v]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>
              {v}
            </button>
          ))}
        </div>

        {message && <div className={`message-box ${message.startsWith("✅") ? "success" : "error"}`}>{message}</div>}

        {tab === "appointments" ? (
          <>
            <div className="mg-filters">
              {FILTERS.map(([k, v]) => (
                <button key={k} type="button" className={filter === k ? "on" : ""} onClick={() => setFilter(k)}>
                  {v}
                </button>
              ))}
              <button type="button" className="mg-refresh" onClick={load} aria-label="Refresh">
                ↻
              </button>
            </div>
            {bookings === null ? (
              <p className="text-gray">Loading appointments…</p>
            ) : shown.length === 0 ? (
              <p className="mg-empty">No appointments here.</p>
            ) : (
              <div className="mg-list">
                {shown.map((b, i) => {
                  const services = [b.serviceName, ...(b.additionalServices || []).map(s => s.name)].filter(Boolean);
                  const jc = jobByBooking[b._id];
                  const phone = String(b.phone || "").replace(/[^\d+]/g, "");
                  return (
                    <article key={b._id} className="mg-card" style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}>
                      <div className="mg-time">
                        <strong>{b.bookingTime}</strong>
                        <span>{fmtDay(b.bookingDate)}</span>
                      </div>
                      <div className="mg-body">
                        <div className="mg-row">
                          <strong className="mg-name">{b.name}</strong>
                          <span className={`ws-badge ${b.status === "confirmed" ? "ws-completed" : "ws-open"}`}>
                            {b.status === "confirmed" ? "Confirmed" : "Pending"}
                          </span>
                          {b.pickup?.required && <span className="ws-badge mg-pickup-badge">🚗 Pickup</span>}
                        </div>
                        <p className="mg-car">
                          {b.vehicleBrand} {b.vehicleModel}
                        </p>
                        <p className="text-gray text-sm">{services.join(", ")}</p>
                        {b.pickup?.required && (
                          <a
                            className="mg-address"
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.pickup.address + ", Guntur")}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            📍 {b.pickup.address}
                            {b.pickup.landmark ? ` (near ${b.pickup.landmark})` : ""}
                          </a>
                        )}
                        {b.notes && <p className="mg-notes">“{b.notes}”</p>}
                        <div className="mg-actions">
                          <a className="btn-edit ws-a" href={`tel:${phone}`}>
                            Call
                          </a>
                          <a className="btn-edit ws-a" href={`https://wa.me/${phone.replace("+", "")}`} target="_blank" rel="noreferrer">
                            WhatsApp
                          </a>
                          {b.status !== "confirmed" && (
                            <button type="button" className="btn-accept ws-auto" onClick={() => confirm(b)} disabled={busy === b._id}>
                              {busy === b._id ? "…" : "Confirm"}
                            </button>
                          )}
                          {jc ? (
                            <button type="button" className="btn-edit ws-auto" onClick={() => setTab("flow")}>
                              {jc.number} · {{ open: "Open", in_progress: "In progress", completed: "Completed", delivered: "Delivered" }[jc.status] || jc.status}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn-primary mg-jc"
                              onClick={() => {
                                setDraft(jobCardFromBooking(b));
                                setTab("flow");
                              }}
                            >
                              + Job card
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <JobCardsTab
            draft={draft}
            clearDraft={clearDraft}
            setMessage={setMessage}
            canDelete={me.level === "admin"}
            defaultView="board"
            onChanged={load}
          />
        )}
      </main>
    </div>
  );
}
