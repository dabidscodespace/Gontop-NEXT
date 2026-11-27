"use client";

import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  PackageCheck,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";
import { useState } from "react";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Sign-in failed.");
      // A full document navigation avoids a race between App Router push/refresh
      // and guarantees the newly issued session cookie is used immediately.
      window.location.replace("/admin");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Sign-in failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh bg-[#f6f6f7] p-3 sm:p-5 lg:p-7">
      <div className="mx-auto grid min-h-[calc(100dvh-1.5rem)] max-w-6xl overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.12)] sm:min-h-[calc(100dvh-2.5rem)] lg:min-h-[calc(100dvh-3.5rem)] lg:grid-cols-[1.05fr_.95fr]">
        <section className="relative hidden overflow-hidden bg-[#151515] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
          <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-accent-orange/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-36 -left-28 h-96 w-96 rounded-full bg-orange-700/10 blur-3xl" />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.8) 1px, transparent 1px)", backgroundSize: "42px 42px" }}
          />

          <div className="relative">
            <Link href="/" className="inline-flex items-center gap-3" aria-label="GONTOP storefront">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.07] ring-1 ring-white/10">
                <img src="/logo-2.png" alt="" className="h-8 w-8 object-contain" />
              </span>
              <span>
                <span className="block text-base font-black tracking-[0.14em]">GONTOP</span>
                <span className="block text-[9px] font-bold uppercase tracking-[0.22em] text-white/40">Admin operations</span>
              </span>
            </Link>
          </div>

          <div className="relative max-w-lg py-12">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-accent-orange">Your command centre</p>
            <h1 className="mt-4 text-4xl font-black leading-[1.05] tracking-[-0.04em] xl:text-5xl">
              Run every top-up operation from one place.
            </h1>
            <p className="mt-5 max-w-md text-sm leading-7 text-white/55">
              Process orders, control the catalogue, verify payments and support customers with a secure, permission-aware workspace.
            </p>

            <div className="mt-9 grid grid-cols-3 gap-3">
              <Feature icon={ShoppingBag} label="Orders" />
              <Feature icon={PackageCheck} label="Catalogue" />
              <Feature icon={BarChart3} label="Insights" />
            </div>
          </div>

          <div className="relative flex items-center gap-2 text-[11px] font-semibold text-white/35">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Encrypted sessions · Role-based permissions · Audited actions
          </div>
        </section>

        <section className="flex min-h-full flex-col">
          <header className="flex items-center justify-between border-b border-gray-100 px-5 py-4 sm:px-8 lg:border-0 lg:px-10 lg:py-8">
            <Link href="/" className="flex items-center gap-2 lg:hidden" aria-label="GONTOP home">
              <img src="/logo-2.png" alt="" className="h-8 w-8 object-contain" />
              <span className="text-xs font-black tracking-[0.12em] text-gray-950">GONTOP</span>
            </Link>
            <Link href="/" className="ml-auto inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 transition hover:text-accent-orange">
              Back to store <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </header>

          <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-10 lg:px-14 xl:px-20">
            <div className="w-full max-w-md">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-accent-orange ring-1 ring-inset ring-orange-100">
                <LockKeyhole className="h-5 w-5" />
              </span>
              <h2 className="mt-5 text-3xl font-black tracking-[-0.035em] text-gray-950">Welcome back</h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">Sign in with your GONTOP administrator account.</p>

              <form
                action="/api/admin/auth/login"
                method="post"
                onSubmit={submit}
                className="mt-8 space-y-5"
                aria-busy={loading}
              >
                <div>
                  <label htmlFor="admin-email" className="mb-1.5 block text-xs font-extrabold text-gray-700">Email address</label>
                  <input
                    id="admin-email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="admin@example.com"
                    autoComplete="username"
                    autoFocus
                    required
                    disabled={loading}
                    className="h-12 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-sm font-medium text-gray-900 outline-none transition placeholder:font-normal placeholder:text-gray-400 hover:border-gray-300 focus:border-accent-orange focus:ring-4 focus:ring-accent-orange/10 disabled:bg-gray-50"
                  />
                </div>

                <div>
                  <label htmlFor="admin-password" className="mb-1.5 block text-xs font-extrabold text-gray-700">Password</label>
                  <div className="relative">
                    <input
                      id="admin-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      required
                      disabled={loading}
                      className="h-12 w-full rounded-xl border border-gray-200 bg-white px-3.5 pr-12 text-sm font-medium text-gray-900 outline-none transition placeholder:font-normal placeholder:text-gray-400 hover:border-gray-300 focus:border-accent-orange focus:ring-4 focus:ring-accent-orange/10 disabled:bg-gray-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div role="alert" aria-live="polite" className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                    <AlertCircle className="mt-px h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gray-950 text-sm font-extrabold text-white shadow-lg shadow-gray-950/10 transition hover:-translate-y-px hover:bg-gray-800 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gray-300 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4 text-accent-orange" />}
                  {loading ? "Signing you in…" : "Sign in securely"}
                </button>
              </form>

              <div className="mt-7 flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2.5 text-[11px] font-medium text-gray-500">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                Access is limited by your assigned role and permissions.
              </div>
            </div>
          </div>

          <footer className="px-6 py-5 text-center text-[10px] font-semibold text-gray-400">
            GONTOP secure administration
          </footer>
        </section>
      </div>
    </main>
  );
}

function Feature({ icon: Icon, label }: { icon: typeof ShoppingBag; label: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.045] p-3.5 backdrop-blur-sm">
      <Icon className="h-4 w-4 text-accent-orange" />
      <p className="mt-3 text-xs font-extrabold text-white/80">{label}</p>
    </div>
  );
}
