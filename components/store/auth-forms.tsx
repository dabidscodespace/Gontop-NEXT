"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: Record<string, string | number | boolean>,
          ) => void;
        };
      };
    };
  }
}

function safeNext(next: string | undefined, fallback = "/") {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}

export function GoogleSignIn({ next }: { next?: string }) {
  const router = useRouter();
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    if (!clientId || !scriptReady || !containerRef.current) return;
    const google = window.google;
    if (!google) return;

    google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response) => {
        setError("");
        try {
          const result = await fetch("/api/auth/google", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ credential: response.credential }),
          });
          const data = await result.json();
          if (!result.ok || !data.ok) throw new Error(data.error || "Google sign-in failed.");
          router.push(safeNext(next));
          router.refresh();
        } catch (signInError) {
          setError(signInError instanceof Error ? signInError.message : "Google sign-in failed.");
        }
      },
    });

    containerRef.current.innerHTML = "";
    google.accounts.id.renderButton(containerRef.current, {
      theme: "outline",
      shape: "pill",
      text: "continue_with",
      size: "large",
      width: 320,
    });
  }, [clientId, next, router, scriptReady]);

  if (!clientId) return null;

  return (
    <div className="mt-4">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />
      <div className="flex items-center gap-3 text-[11px] uppercase tracking-wide text-gray-400">
        <span className="h-px flex-1 bg-gray-200" /> or <span className="h-px flex-1 bg-gray-200" />
      </div>
      <div ref={containerRef} className="mt-4 flex justify-center" />
      {error && <p className="mt-2 text-center text-xs text-red-500">{error}</p>}
    </div>
  );
}

function PasswordInput({
  value,
  onChange,
  placeholder,
  autoComplete,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete: string;
  id: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        minLength={8}
        className="h-11 w-full rounded-lg border border-gray-300 px-3 pr-10 text-sm text-gray-800 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-600"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function LoginForm({ next }: { next?: string }) {
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
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Sign-in failed.");
      router.push(safeNext(next));
      router.refresh();
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : "Sign-in failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-center text-xl font-bold text-gray-800">
        Sign in to <span className="text-orange-500">GONTOP</span>
      </h1>
      <p className="mt-1 text-center text-sm text-gray-500">
        Manage your orders and top up with G Coin.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-3">
        <div>
          <label htmlFor="login-email" className="mb-1 block text-xs font-semibold text-gray-600">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
            className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-800 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          />
        </div>
        <div>
          <label htmlFor="login-password" className="mb-1 block text-xs font-semibold text-gray-600">
            Password
          </label>
          <PasswordInput
            id="login-password"
            value={password}
            onChange={setPassword}
            placeholder="Your password"
            autoComplete="current-password"
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-600">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-orange-500 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-60"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <GoogleSignIn next={next} />

      <p className="mt-6 text-center text-sm text-gray-500">
        New to GONTOP?{" "}
        <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-orange-500 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not create account.");
      router.push(safeNext(next));
      router.refresh();
    } catch (registerError) {
      setError(registerError instanceof Error ? registerError.message : "Could not create account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-center text-xl font-bold text-gray-800">
        Join <span className="text-orange-500">GONTOP</span>
      </h1>
      <p className="mt-1 text-center text-sm text-gray-500">
        Create an account to order and track top-ups.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-3">
        <div>
          <label htmlFor="reg-name" className="mb-1 block text-xs font-semibold text-gray-600">
            Full name
          </label>
          <input
            id="reg-name"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="Your name"
            autoComplete="name"
            required
            minLength={2}
            className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-800 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          />
        </div>
        <div>
          <label htmlFor="reg-email" className="mb-1 block text-xs font-semibold text-gray-600">
            Email
          </label>
          <input
            id="reg-email"
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            placeholder="you@example.com"
            autoComplete="email"
            required
            className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-800 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          />
        </div>
        <div>
          <label htmlFor="reg-phone" className="mb-1 block text-xs font-semibold text-gray-600">
            Phone <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <input
            id="reg-phone"
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
            placeholder="01XXXXXXXXX"
            autoComplete="tel"
            className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-800 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          />
        </div>
        <div>
          <label htmlFor="reg-password" className="mb-1 block text-xs font-semibold text-gray-600">
            Password
          </label>
          <PasswordInput
            id="reg-password"
            value={form.password}
            onChange={(password) => setForm({ ...form, password })}
            placeholder="At least 8 characters"
            autoComplete="new-password"
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-600">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-orange-500 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-60"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>

      <GoogleSignIn next={next} />

      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-orange-500 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
