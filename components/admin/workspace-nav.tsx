import Link from "next/link";
import {
  BarChart3,
  CreditCard,
  Image as ImageIcon,
  KeyRound,
  LayoutGrid,
  Package,
  Settings2,
  ShieldCheck,
  Upload,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import type { SessionAdmin } from "@/lib/auth";
import { hasPermission, type Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

type WorkspaceItem = {
  key: string;
  label: string;
  description?: string;
  href: string;
  icon?: LucideIcon;
  badge?: ReactNode;
  permission?: Permission;
};

export function WorkspaceNav({
  label,
  items,
  active,
  compact = false,
}: {
  label: string;
  items: WorkspaceItem[];
  active: string;
  compact?: boolean;
}) {
  return (
    <nav
      aria-label={label}
      className="admin-scrollbar flex gap-1.5 overflow-x-auto rounded-2xl border border-gray-200/90 bg-white p-1.5 shadow-[0_1px_2px_rgba(16,24,40,0.025)]"
    >
      {items.map((item) => {
        const current = item.key === active;
        const Icon = item.icon;
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={current ? "page" : undefined}
            className={cn(
              "group flex shrink-0 items-center gap-2.5 rounded-xl outline-none transition focus-visible:ring-4 focus-visible:ring-accent-orange/15",
              compact ? "min-h-9 px-3 py-2" : "min-h-12 min-w-[150px] flex-1 px-3 py-2.5",
              current
                ? "bg-gray-950 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-950",
            )}
          >
            {Icon && (
              <span
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-lg",
                  compact ? "h-6 w-6" : "h-8 w-8",
                  current
                    ? "bg-white/10 text-accent-orange"
                    : "bg-gray-100 text-gray-500 group-hover:bg-white group-hover:text-accent-orange group-hover:shadow-sm",
                )}
              >
                <Icon className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
              </span>
            )}
            <span className="min-w-0">
              <span className={cn("flex items-center gap-2 font-extrabold", compact ? "text-xs" : "text-[13px]")}>
                <span className="truncate">{item.label}</span>
                {item.badge !== undefined && (
                  <span className={cn("rounded-md px-1.5 py-0.5 text-[9px] font-black tabular-nums", current ? "bg-white/10 text-white/70" : "bg-gray-100 text-gray-500")}>{item.badge}</span>
                )}
              </span>
              {!compact && item.description && (
                <span className={cn("mt-0.5 block truncate text-[10px] font-medium", current ? "text-white/45" : "text-gray-400")}>{item.description}</span>
              )}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

function allowed(admin: SessionAdmin, items: WorkspaceItem[]) {
  return items.filter((item) => !item.permission || hasPermission(admin, item.permission));
}

export function CustomerMoneyNav({
  admin,
  active,
}: {
  admin: SessionAdmin;
  active: "customers" | "payments" | "wallets" | "reports";
}) {
  const items: WorkspaceItem[] = [
    {
      key: "customers",
      label: "Customers",
      description: "Accounts, orders and access",
      href: "/admin/customers",
      icon: Users,
      permission: "customers.view",
    },
    {
      key: "payments",
      label: "Payments",
      description: "Gateway records and verification",
      href: "/admin/payments",
      icon: CreditCard,
      permission: "payments.view",
    },
    {
      key: "wallets",
      label: "Wallets",
      description: "Balances and ledger activity",
      href: "/admin/wallets",
      icon: Wallet,
      permission: "wallet.manage",
    },
    {
      key: "reports",
      label: "Reports",
      description: "Revenue, sales and stock",
      href: "/admin/reports",
      icon: BarChart3,
      permission: "reports.view",
    },
  ];

  return <WorkspaceNav label="Customers and money" items={allowed(admin, items)} active={active} />;
}

export function CommerceNav({
  admin,
  active,
}: {
  admin: SessionAdmin;
  active: "products" | "categories" | "methods" | "banners";
}) {
  const items: WorkspaceItem[] = [
    {
      key: "products",
      label: "Products",
      description: "Products, packages and pricing",
      href: "/admin/products",
      icon: Package,
      permission: "products.manage",
    },
    {
      key: "categories",
      label: "Categories",
      description: "Sections and Popular Games",
      href: "/admin/categories",
      icon: LayoutGrid,
      permission: "categories.manage",
    },
    {
      key: "methods",
      label: "Top-up methods",
      description: "Checkout account identifiers",
      href: "/admin/topup-methods",
      icon: KeyRound,
      permission: "products.manage",
    },
    {
      key: "banners",
      label: "Banners",
      description: "Homepage carousel slides",
      href: "/admin/banners",
      icon: ImageIcon,
      permission: "banners.manage",
    },
  ];

  return <WorkspaceNav label="Commerce workspace" items={allowed(admin, items)} active={active} />;
}

export function SystemNav({
  admin,
  active,
}: {
  admin: SessionAdmin;
  active: "settings" | "migration" | "team";
}) {
  const items: WorkspaceItem[] = [
    {
      key: "settings",
      label: "Store settings",
      description: "Features, limits and integrations",
      href: "/admin/settings",
      icon: Settings2,
      permission: "settings.manage",
    },
    {
      key: "migration",
      label: "Data migration",
      description: "Preview, import and export CSV",
      href: "/admin/import",
      icon: Upload,
      permission: "csv.manage",
    },
    {
      key: "team",
      label: "Team access",
      description: "Staff roles and permissions",
      href: "/admin/admins",
      icon: ShieldCheck,
      permission: "staff.manage",
    },
  ];

  return <WorkspaceNav label="System administration" items={allowed(admin, items)} active={active} />;
}
