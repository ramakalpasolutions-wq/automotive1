"use client";

// Loads one invoice / job card and shows it with Print and Back buttons.
import { useEffect, useState } from "react";
import { InvoiceDocument, JobCardDocument } from "./Documents";

export default function DocumentView({ url, type, backHref, backLabel, signInHref }) {
  const [state, setState] = useState({ item: null, error: "" });

  useEffect(() => {
    let alive = true;
    fetch(url)
      .then(async r => {
        const d = await r.json().catch(() => ({}));
        if (!alive) return;
        if (r.status === 401 && signInHref) window.location.href = signInHref;
        else if (!r.ok || !d.item) setState({ item: null, error: d.error || "Not found" });
        else setState({ item: d.item, error: "" });
      })
      .catch(() => alive && setState({ item: null, error: "Could not load. Please try again." }));
    return () => {
      alive = false;
    };
  }, [url, signInHref]);

  return (
    <div style={{ padding: "24px 16px 48px", background: "#f3f4f6", minHeight: "70vh" }}>
      <div className="no-print" style={{ maxWidth: 820, margin: "0 auto 16px", display: "flex", justifyContent: "space-between", gap: 12 }}>
        <a href={backHref} style={{ color: "#111827", fontWeight: 600 }}>← {backLabel}</a>
        {state.item && (
          <button
            type="button"
            onClick={() => window.print()}
            style={{ background: "#111827", color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontWeight: 700, cursor: "pointer" }}
          >
            Print / Save as PDF
          </button>
        )}
      </div>
      {state.error ? (
        <p style={{ textAlign: "center", color: "#6b7280" }}>{state.error}</p>
      ) : !state.item ? (
        <p style={{ textAlign: "center", color: "#6b7280" }}>Loading…</p>
      ) : type === "invoice" ? (
        <InvoiceDocument invoice={state.item} />
      ) : (
        <JobCardDocument jobCard={state.item} />
      )}
    </div>
  );
}
