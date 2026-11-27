"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CreditCard,
  Gamepad2,
  KeyRound,
  LayoutGrid,
  Image as ImageIcon,
  LayoutDashboard,
  Menu,
  Package,
  Settings,
  Shield,
  ShoppingBag,
  Upload,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { AdminLogout } from "@/components/admin/admin-logout";
import type { SessionAdmin } from "@/lib/auth";
import { hasPermission, type Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission: Permission;
};

const NAV_GROUPS: Array<{ title: string; items: NavItem[] }> = [
  {
    title: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard.view" },
    ],
  },
  {
    title: "Catalog",
    items: [
      { href: "/admin/games", label: "Games", icon: Gamepad2, permission: "categories.manage" },
      { href: "/admin/categories", label: "Categories", icon: LayoutGrid, permission: "categories.manage" },
      { href: "/admin/products", label: "Products", icon: Package, permission: "products.manage" },
      { href: "/admin/topup-methods", label: "Top-up methods", icon: KeyRound, permission: "products.manage" },
      { href: "/admin/banners", label: "Banners", icon: ImageIcon, permission: "banners.manage" },
    ],
  },
  {
    title: "Sales",
    items: [
      { href: "/admin/orders", label: "Orders", icon: ShoppingBag, permission: "orders.view" },
      { href: "/admin/payments", label: "Payments", icon: CreditCard, permission: "payments.view" },
      { href: "/admin/customers", label: "Customers", icon: Users, permission: "customers.view" },
      { href: "/admin/wallets", label: "Wallets", icon: Wallet, permission: "wallet.manage" },
      { href: "/admin/reports", label: "Reports", icon: BarChart3, permission: "reports.view" },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/admin/import", label: "CSV Migration", icon: Upload, permission: "csv.manage" },
      { href: "/admin/settings", label: "Settings", icon: Settings, permission: "settings.manage" },
      { href: "/admin/admins", label: "Admins", icon: Shield, permission: "staff.manage" },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((group) => group.items);

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

function Brand() {
  return (
    <div className="flex items-center gap-3 px-4 py-5">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
        <img src="/logo-2.png" alt="" className="h-7 w-7 object-contain" />
      </span>
      <div>
        <p className="text-sm font-extrabold leading-tight tracking-wide text-white">GONTOP</p>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent-orange">
          Admin CMS
        </p>
      </div>
    </div>
  );
}

function Nav({ admin, onNavigate }: { admin: SessionAdmin; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4">
      {NAV_GROUPS.map((group) => {
        const items = group.items.filter((item) => hasPermission(admin, item.permission));
        if (items.length === 0) return null;
        return (
          <div key={group.title}>
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {items.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all",
                      active
                        ? "bg-accent-orange text-white shadow-lg shadow-orange-500/25"
                        : "text-white/65 hover:bg-white/5 hover:text-white",
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        active ? "text-white" : "text-white/50 group-hover:text-accent-orange",
                      )}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

function UserChip({ admin }: { admin: SessionAdmin }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-orange to-orange-700 text-xs font-bold text-white">
        {(admin.name || admin.email).charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-white">{admin.name || admin.email}</p>
        <p className="truncate text-[10px] capitalize text-white/50">{admin.role}</p>
      </div>
    </div>
  );
}

export function AdminShell({ admin, children }: { admin: SessionAdmin; children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  const current = ALL_ITEMS.find((item) => isActive(pathname, item.href));

  // Close the mobile drawer on navigation (adjusting state during render, not in an effect).
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  // Escape closes the mobile drawer.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="min-h-screen bg-[#f4f5f7] lg:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-primary lg:flex">
        <Brand />
        <Nav admin={admin} />
        <div className="p-3">
          <UserChip admin={admin} />
        </div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <aside aria-label="Admin navigation" className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-primary shadow-2xl">
            <div className="flex items-center justify-between pr-3">
              <Brand />
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-white/70 hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <Nav admin={admin} onNavigate={() => setOpen(false)} />
            <div className="p-3">
              <UserChip admin={admin} />
            </div>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-gray-200/80 bg-white/85 px-4 py-3 backdrop-blur-md lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-600 lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-gray-900 lg:hidden">
                {current?.label ?? "GONTOP Admin"}
              </p>
              <p className="hidden truncate text-sm font-semibold text-gray-500 lg:block">
                {current?.label ?? "GONTOP Admin"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500 md:flex">
              <span className="font-semibold text-gray-700">{admin.email}</span>
              <span className="rounded-full bg-accent-orange/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-orange">
                {admin.role}
              </span>
            </span>
            <AdminLogout />
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
