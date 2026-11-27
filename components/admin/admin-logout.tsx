"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function AdminLogout() {
  const router = useRouter();

  return (
    <button
      onClick={async () => {
        await fetch("/api/auth/logout?scope=admin", { method: "POST" });
        router.push("/admin/login");
        router.refresh();
      }}
      className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
    >
      <LogOut className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Log out</span>
    </button>
  );
}
