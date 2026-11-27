"use client";

import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, LockKeyhole } from "lucide-react";
import { useState } from "react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Sign-in failed.");
      router.push("/admin");
      router.refresh();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Sign-in failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex flex-col items-center">
          <img src="/logo.png" alt="GONTOP" className="h-14" />
          <div className="mt-3 flex h-10 w-10 items-center justify-center rounded-full bg-orange-50">
            <LockKeyhole className="h-5 w-5 text-accent-orange" />
          </div>
          <h1 className="mt-2 text-lg font-bold text-gray-900">Admin sign in</h1>
          <p className="text-xs text-gray-500">Manage GONTOP from one place.</p>
        </div>

        <form onSubmit={submit} className="mt-5 space-y-3">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Admin email"
            autoComplete="username"
            required
            className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            required
            className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          />

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-600">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent-orange text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
