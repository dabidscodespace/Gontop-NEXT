"use client";

import { Loader2, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminLogout() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      aria-label="Log out of admin"
      title="Log out"
      onClick={async () => {
        if (pending) return;
        setPending(true);
        try {
          await fetch("/api/auth/logout?scope=admin", { method: "POST" });
          router.push("/admin/login");
          router.refresh();
        } finally {
          setPending(false);
        }
      }}
      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-2.5 text-xs font-bold text-gray-500 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-wait disabled:opacity-60 sm:px-3"
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
      <span className="hidden 2xl:inline">Log out</span>
    </button>
  );
}
