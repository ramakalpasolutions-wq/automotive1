"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Only allow returning to a page on this site.
const safeNext = n => (typeof n === "string" && n.startsWith("/") && !n.startsWith("//") ? n : "/account");

async function post(url, body) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}

const TITLES = {
  signin: ["Sign in", "Book services and see your bookings, job cards and invoices."],
  signup: ["Create your account", "It takes a minute. You'll need it to book a service."],
  forgot: ["Forgot password?", "We'll email you a 6-digit code."],
  reset: ["Enter your code", "Check your email, then choose a new password."],
};

export default function LoginPage() {
  const [mode, setMode] = useState("signin");
  const [next, setNext] = useState("/account");
  const [f, setF] = useState({ name: "", email: "", phone: "", password: "", code: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setNext(safeNext(sp.get("next"))); // eslint-disable-line react-hooks/set-state-in-effect
    if (sp.get("mode") === "signup") setMode("signup");
    // Already signed in? Go straight on.
    fetch("/api/app/me").then(r => {
      if (r.ok) window.location.replace(safeNext(sp.get("next")));
    });
  }, []);

  const set = patch => {
    setError("");
    setF(x => ({ ...x, ...patch }));
  };
  const go = m => {
    setMode(m);
    setError("");
    setInfo("");
  };

  const submit = async e => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "signin") await post("/api/account/login", { email: f.email, password: f.password });
      else if (mode === "signup") await post("/api/account/signup", { name: f.name, email: f.email, phone: f.phone, password: f.password });
      else if (mode === "forgot") {
        const d = await post("/api/app/forgot", { email: f.email });
        setInfo(d.message || "Check your email for a code.");
        setMode("reset");
        setBusy(false);
        return;
      } else await post("/api/account/reset", { email: f.email, code: f.code, password: f.password });
      window.dispatchEvent(new Event("accountChanged"));
      window.location.href = next;
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const [title, sub] = TITLES[mode];
  const input = "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10";

  return (
    <main className="px-4 py-14">
      <div className="anim-fade-up mx-auto w-full max-w-md rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 sm:p-8">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="mt-1 text-gray-600">{sub}</p>

        {(mode === "signin" || mode === "signup") && (
          <div className="mt-6 grid grid-cols-2 rounded-xl bg-gray-100 p-1 text-sm font-semibold">
            {[
              ["signin", "Sign in"],
              ["signup", "Create account"],
            ].map(([k, v]) => (
              <button
                key={k}
                type="button"
                onClick={() => go(k)}
                className={`rounded-lg py-2 ${mode === k ? "bg-white text-gray-900 shadow-sm" : "text-gray-600"}`}
              >
                {v}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "signup" && (
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Full name</span>
              <input className={input} value={f.name} onChange={e => set({ name: e.target.value })} autoComplete="name" required />
            </label>
          )}
          {mode !== "reset" && (
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Email</span>
              <input className={input} type="email" value={f.email} onChange={e => set({ email: e.target.value })} autoComplete="email" required />
            </label>
          )}
          {mode === "signup" && (
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Phone</span>
              <input className={input} type="tel" value={f.phone} onChange={e => set({ phone: e.target.value })} autoComplete="tel" placeholder="+91 98765 43210" />
            </label>
          )}
          {mode === "reset" && (
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">6-digit code</span>
              <input className={input} value={f.code} onChange={e => set({ code: e.target.value.replace(/\D/g, "").slice(0, 6) })} inputMode="numeric" autoComplete="one-time-code" required />
            </label>
          )}
          {mode !== "forgot" && (
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">{mode === "signin" ? "Password" : "New password (8+ characters)"}</span>
              <input
                className={input}
                type="password"
                value={f.password}
                onChange={e => set({ password: e.target.value })}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                minLength={mode === "signin" ? undefined : 8}
                required
              />
            </label>
          )}

          {info && <p className="text-sm font-medium text-green-700">{info}</p>}
          {error && <p className="text-sm font-medium text-red-600" role="alert">{error}</p>}

          <button type="submit" disabled={busy} className="w-full rounded-xl bg-gray-900 py-3 font-semibold text-white hover:bg-gray-800 disabled:opacity-60">
            {busy ? "Please wait…" : { signin: "Sign in", signup: "Create account", forgot: "Send code", reset: "Set new password" }[mode]}
          </button>
        </form>

        <div className="mt-5 text-center text-sm">
          {mode === "signin" && (
            <button type="button" onClick={() => go("forgot")} className="font-semibold text-amber-600 hover:underline">
              Forgot password?
            </button>
          )}
          {(mode === "forgot" || mode === "reset") && (
            <button type="button" onClick={() => go("signin")} className="font-semibold text-amber-600 hover:underline">
              Back to sign in
            </button>
          )}
        </div>
        <p className="mt-6 text-center text-xs text-gray-500">
          Need help? Call <a className="underline" href="tel:+919392792067">+91 93927 92067</a> · <Link className="underline" href="/contact">Contact us</Link>
        </p>
      </div>
    </main>
  );
}
