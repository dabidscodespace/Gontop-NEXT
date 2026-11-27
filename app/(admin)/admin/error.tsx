"use client";

import Link from "next/link";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { useEffect } from "react";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Admin page error", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center py-10">
      <section className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-7 text-center shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:p-9">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 ring-1 ring-inset ring-red-100">
          <AlertTriangle className="h-6 w-6" />
        </span>
        <p className="mt-5 text-[10px] font-black uppercase tracking-[0.18em] text-red-500">Something went wrong</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-gray-950">This admin page could not load</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">
          Your data was not changed. Try loading the page again, or return to the overview.
        </p>
        {error.digest && <p className="mt-3 font-mono text-[10px] text-gray-400">Reference: {error.digest}</p>}
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <button type="button" onClick={reset} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-accent-orange px-4 text-sm font-extrabold text-white shadow-sm">
            <RefreshCw className="h-4 w-4" /> Try again
          </button>
          <Link href="/admin" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-extrabold text-gray-700 shadow-sm">
            <Home className="h-4 w-4" /> Overview
          </Link>
        </div>
      </section>
    </div>
  );
}
