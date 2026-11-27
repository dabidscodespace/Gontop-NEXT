"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  CreditCard,
  ExternalLink,
  Gamepad2,
  Image as ImageIcon,
  KeyRound,
  LayoutDashboard,
  LayoutGrid,
  Menu,
  Package,
  Plus,
  Search,
  Settings,
  Shield,
  ShoppingBag,
  Upload,
  UserRound,
  Users,
  Wallet,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";

import { AdminLogout } from "@/components/admin/admin-logout";
import type { SessionAdmin } from "@/lib/auth";
import { hasPermission, type Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: typeof LayoutDashboard;
  permission: Permission;
  keywords?: string;
};

type NavGroup = { title: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Workspace",
    items: [
      {
        href: "/admin",
        label: "Overview",
        description: "Sales and operational summary",
        icon: LayoutDashboard,
        permission: "dashboard.view",
        keywords: "dashboard home stats",
      },
    ],
  },
  {
    title: "Commerce",
    items: [
      {
        href: "/admin/orders",
        label: "Orders",
        description: "Process and fulfil orders",
        icon: ShoppingBag,
        permission: "orders.view",
        keywords: "sales transactions fulfilment",
      },
      {
        href: "/admin/products",
        label: "Products",
        description: "Products, packages and pricing",
        icon: Package,
        permission: "products.manage",
        keywords: "catalogue sku package variation",
      },
      {
        href: "/admin/categories",
        label: "Categories",
        description: "Product sections and Popular Games",
        icon: LayoutGrid,
        permission: "categories.manage",
        keywords: "homepage collection section popular games region modal",
      },
      {
        href: "/admin/topup-methods",
        label: "Top-up methods",
        description: "Customer account identifiers",
        icon: KeyRound,
        permission: "products.manage",
        keywords: "uid login player fields",
      },
      {
        href: "/admin/banners",
        label: "Banners",
        description: "Homepage carousel",
        icon: ImageIcon,
        permission: "banners.manage",
        keywords: "homepage slides images",
      },
    ],
  },
  {
    title: "Customers & money",
    items: [
      {
        href: "/admin/customers",
        label: "Customers",
        description: "Accounts and order history",
        icon: Users,
        permission: "customers.view",
        keywords: "users accounts email phone",
      },
      {
        href: "/admin/payments",
        label: "Payments",
        description: "Gateway payment records",
        icon: CreditCard,
        permission: "payments.view",
        keywords: "gateway invoice transaction",
      },
      {
        href: "/admin/wallets",
        label: "Wallets",
        description: "Balances and adjustments",
        icon: Wallet,
        permission: "wallet.manage",
        keywords: "g coin balance ledger",
      },
      {
        href: "/admin/reports",
        label: "Reports",
        description: "Revenue and stock insights",
        icon: BarChart3,
        permission: "reports.view",
        keywords: "analytics revenue stock sales",
      },
    ],
  },
  {
    title: "System",
    items: [
      {
        href: "/admin/import",
        label: "Data migration",
        description: "Import and export CSV data",
        icon: Upload,
        permission: "csv.manage",
        keywords: "csv wordpress woocommerce export",
      },
      {
        href: "/admin/settings",
        label: "Settings",
        description: "Store and payment settings",
        icon: Settings,
        permission: "settings.manage",
        keywords: "configuration preferences",
      },
      {
        href: "/admin/admins",
        label: "Team access",
        description: "Admins and permissions",
        icon: Shield,
        permission: "staff.manage",
        keywords: "moderators staff roles",
      },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((group) => group.items);

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/admin"
      className={cn(
        "flex h-[76px] items-center border-b border-white/[0.07] transition-all",
        compact ? "justify-center px-2" : "gap-3 px-5",
      )}
      aria-label="GONTOP admin overview"
    >
      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/[0.07] ring-1 ring-white/10">
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-accent-orange ring-2 ring-[#151515]" />
        <img src="/logo-2.png" alt="" className="h-7 w-7 object-contain" />
      </span>
      {!compact && (
        <div className="min-w-0">
          <p className="text-sm font-black leading-none tracking-[0.14em] text-white">GONTOP</p>
          <p className="mt-1.5 text-[9px] font-bold uppercase tracking-[0.22em] text-white/40">
            Operations
          </p>
        </div>
      )}
    </Link>
  );
}

function Navigation({
  admin,
  compact = false,
  onNavigate,
}: {
  admin: SessionAdmin;
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className={cn("admin-scrollbar flex-1 overflow-y-auto py-5", compact ? "px-2" : "px-3")}>
      <div className="space-y-6">
        {NAV_GROUPS.map((group) => {
          const items = group.items.filter((item) => hasPermission(admin, item.permission));
          if (items.length === 0) return null;

          return (
            <div key={group.title}>
              {!compact && (
                <p className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.2em] text-white/30">
                  {group.title}
                </p>
              )}
              {compact && <div className="mx-auto mb-2 h-px w-6 bg-white/10 first:hidden" />}
              <div className="space-y-1">
                {items.map((item) => {
                  const active = isActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      title={compact ? item.label : undefined}
                      className={cn(
                        "group relative flex min-h-10 items-center rounded-xl text-[13px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-orange",
                        compact ? "justify-center px-2" : "gap-3 px-3",
                        active
                          ? "bg-white/[0.09] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]"
                          : "text-white/55 hover:bg-white/[0.055] hover:text-white",
                      )}
                    >
                      {active && (
                        <span className="absolute -left-0.5 h-5 w-1 rounded-full bg-accent-orange shadow-[0_0_14px_rgba(249,96,0,0.7)]" />
                      )}
                      <item.icon
                        strokeWidth={active ? 2.2 : 1.8}
                        className={cn(
                          "h-[17px] w-[17px] shrink-0 transition-colors",
                          active ? "text-accent-orange" : "text-white/40 group-hover:text-white/80",
                        )}
                      />
                      {!compact && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </nav>
  );
}

function UserPanel({ admin, compact = false }: { admin: SessionAdmin; compact?: boolean }) {
  const initial = (admin.name || admin.email).charAt(0).toUpperCase();

  if (compact) {
    return (
      <div className="border-t border-white/[0.07] p-3">
        <div
          className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent-orange to-orange-700 text-xs font-black text-white shadow-lg shadow-orange-950/20"
          title={`${admin.name || admin.email} · ${admin.role}`}
        >
          {initial}
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-white/[0.07] p-3">
      <div className="flex items-center gap-3 rounded-xl bg-white/[0.045] p-2.5 ring-1 ring-white/[0.06]">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent-orange to-orange-700 text-xs font-black text-white shadow-lg shadow-orange-950/20">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-white">{admin.name || "Administrator"}</p>
          <p className="truncate text-[10px] capitalize text-white/40">{admin.role} · {admin.email}</p>
        </div>
      </div>
    </div>
  );
}

type CommandItem = {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: typeof Search;
  section: string;
};

function CommandPalette({
  admin,
  onClose,
}: {
  admin: SessionAdmin;
  onClose: () => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const allowedNavigation = useMemo<CommandItem[]>(
    () =>
      ALL_ITEMS.filter((item) => hasPermission(admin, item.permission)).map((item) => ({
        id: item.href,
        label: item.label,
        description: item.description,
        href: item.href,
        icon: item.icon,
        section: "Navigate",
      })),
    [admin],
  );

  const quickItems = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [];
    if (hasPermission(admin, "products.manage")) {
      items.push({
        id: "new-product",
        label: "Create a product",
        description: "Open the new product editor",
        href: "/admin/products/new",
        icon: Plus,
        section: "Quick actions",
      });
    }
    if (hasPermission(admin, "orders.view")) {
      items.push({
        id: "pending-orders",
        label: "Open pending orders",
        description: "Review orders waiting for payment",
        href: "/admin/orders?status=pending_payment",
        icon: ShoppingBag,
        section: "Quick actions",
      });
    }
    items.push({
      id: "storefront",
      label: "Open storefront",
      description: "View the customer-facing website",
      href: "/",
      icon: ExternalLink,
      section: "Quick actions",
    });
    return items;
  }, [admin]);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    const base = [...quickItems, ...allowedNavigation];
    const filtered = term
      ? base.filter((item) => `${item.label} ${item.description}`.toLowerCase().includes(term))
      : base;

    if (!term) return filtered;

    const encoded = encodeURIComponent(query.trim());
    const searches: CommandItem[] = [];
    if (hasPermission(admin, "orders.view")) {
      searches.push({
        id: "search-orders",
        label: `Search orders for “${query.trim()}”`,
        description: "Order number, customer, phone, player ID or product",
        href: `/admin/orders?q=${encoded}`,
        icon: ShoppingBag,
        section: "Search records",
      });
    }
    if (hasPermission(admin, "products.manage")) {
      searches.push({
        id: "search-products",
        label: `Search products for “${query.trim()}”`,
        description: "Product, package, SKU, game or region",
        href: `/admin/products?q=${encoded}`,
        icon: Package,
        section: "Search records",
      });
    }
    if (hasPermission(admin, "customers.view")) {
      searches.push({
        id: "search-customers",
        label: `Search customers for “${query.trim()}”`,
        description: "Customer name or email address",
        href: `/admin/customers?q=${encoded}`,
        icon: Users,
        section: "Search records",
      });
    }
    return [...searches, ...filtered];
  }, [admin, allowedNavigation, query, quickItems]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => Math.min(results.length - 1, current + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(0, current - 1));
    } else if (event.key === "Enter" && results[activeIndex]) {
      event.preventDefault();
      go(results[activeIndex].href);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center px-3 pt-[8vh] sm:px-6 sm:pt-[12vh]">
      <button
        type="button"
        aria-label="Close command menu"
        onClick={onClose}
        className="absolute inset-0 bg-gray-950/55 backdrop-blur-[3px]"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Admin command menu"
        className="relative flex max-h-[72vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/50 bg-white shadow-[0_32px_100px_rgba(15,23,42,0.35)]"
      >
        <div className="flex items-center gap-3 border-b border-gray-100 px-4">
          <Search className="h-5 w-5 shrink-0 text-gray-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Go to a page or search records…"
            aria-label="Search admin commands"
            className="h-16 min-w-0 flex-1 border-0 bg-transparent text-[15px] font-medium text-gray-900 outline-none placeholder:text-gray-400"
          />
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-[10px] font-bold text-gray-500"
          >
            ESC
          </button>
        </div>

        <div className="admin-scrollbar overflow-y-auto p-2">
          {results.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-12 text-center">
              <CircleHelp className="h-7 w-7 text-gray-300" />
              <p className="mt-3 text-sm font-bold text-gray-800">No matching command</p>
              <p className="mt-1 text-xs text-gray-500">Try an order number, customer, product, or page name.</p>
            </div>
          ) : (
            results.map((item, index) => {
              const Icon = item.icon;
              const startsSection = index === 0 || results[index - 1]?.section !== item.section;
              return (
                <div key={item.id}>
                  {startsSection && (
                    <p className="px-3 pb-1.5 pt-3 text-[9px] font-black uppercase tracking-[0.18em] text-gray-400 first:pt-1.5">
                      {item.section}
                    </p>
                  )}
                  <button
                    type="button"
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => go(item.href)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition",
                      activeIndex === index ? "bg-orange-50 text-gray-950" : "text-gray-700 hover:bg-gray-50",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
                        activeIndex === index
                          ? "border-orange-200 bg-white text-accent-orange shadow-sm"
                          : "border-gray-200 bg-gray-50 text-gray-500",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{item.label}</span>
                      <span className="block truncate text-xs text-gray-500">{item.description}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        <footer className="flex items-center justify-between border-t border-gray-100 bg-gray-50/80 px-4 py-2.5 text-[10px] font-semibold text-gray-400">
          <span>↑↓ to move · Enter to open</span>
          <span>Searches use your current permissions</span>
        </footer>
      </section>
    </div>
  );
}

function QuickCreate({ admin }: { admin: SessionAdmin }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const actions = [
    hasPermission(admin, "products.manage")
      ? { href: "/admin/products/new", label: "New product", icon: Package }
      : null,
    hasPermission(admin, "categories.manage")
      ? { href: "/admin/categories?tab=popular&view=library", label: "New game", icon: Gamepad2 }
      : null,
    hasPermission(admin, "banners.manage")
      ? { href: "/admin/banners", label: "New banner", icon: ImageIcon }
      : null,
    hasPermission(admin, "staff.manage")
      ? { href: "/admin/admins", label: "Invite admin", icon: UserRound }
      : null,
  ].filter(Boolean) as Array<{ href: string; label: string; icon: typeof Package }>;

  if (actions.length === 0) return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gray-950 px-3 text-xs font-bold text-white shadow-sm transition hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gray-300"
      >
        <Plus className="h-3.5 w-3.5 text-accent-orange" />
        <span className="hidden sm:inline">Create</span>
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-48 overflow-hidden rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl" role="menu">
          {actions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-orange-50 hover:text-accent-orange"
              role="menuitem"
            >
              <action.icon className="h-4 w-4" />
              {action.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminShell({ admin, children }: { admin: SessionAdmin; children: ReactNode }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const current = ALL_ITEMS.find((item) => isActive(pathname, item.href));
  const currentGroup = NAV_GROUPS.find((group) => group.items.some((item) => item.href === current?.href));

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((value) => !value);
      }
      if (event.key === "Escape") {
        setDrawerOpen(false);
        setCommandOpen(false);
      }
      if (
        event.key === "/" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !["INPUT", "TEXTAREA", "SELECT"].includes((event.target as HTMLElement).tagName)
      ) {
        event.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const toggleCollapsed = () => setCollapsed((value) => !value);

  return (
    <div className="admin-app min-h-dvh bg-[#f6f6f7] text-gray-950 lg:flex">
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col bg-[#151515] transition-[width] duration-300 lg:flex",
          collapsed ? "w-[76px]" : "w-[252px]",
        )}
      >
        <Brand compact={collapsed} />
        <Navigation admin={admin} compact={collapsed} />
        <UserPanel admin={admin} compact={collapsed} />
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute -right-3 top-[88px] z-10 flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:border-orange-200 hover:text-accent-orange"
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-gray-950/60 backdrop-blur-sm"
          />
          <aside
            aria-label="Admin navigation"
            className="absolute inset-y-0 left-0 flex w-[286px] max-w-[86vw] flex-col bg-[#151515] shadow-2xl"
          >
            <div className="relative">
              <Brand />
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setDrawerOpen(false)}
                className="absolute right-3 top-5 flex h-9 w-9 items-center justify-center rounded-xl text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <Navigation admin={admin} onNavigate={() => setDrawerOpen(false)} />
            <UserPanel admin={admin} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-gray-200/80 bg-white/90 backdrop-blur-xl">
          <div className="flex h-[64px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setDrawerOpen(true)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:border-gray-300 lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>

            <div className="hidden min-w-0 lg:block">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">
                <span>{currentGroup?.title ?? "Admin"}</span>
                <ChevronRight className="h-3 w-3" />
              </div>
              <p className="truncate text-sm font-extrabold text-gray-900">{current?.label ?? "GONTOP Admin"}</p>
            </div>

            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              className="group mx-auto flex h-9 min-w-0 flex-1 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 text-left text-xs text-gray-400 transition hover:border-gray-300 hover:bg-white hover:shadow-sm sm:max-w-md lg:ml-8 lg:mr-auto"
              aria-label="Open command menu"
            >
              <Search className="h-3.5 w-3.5 shrink-0 transition group-hover:text-accent-orange" />
              <span className="truncate">Search or jump to…</span>
              <span className="ml-auto hidden shrink-0 items-center gap-0.5 rounded-md border border-gray-200 bg-white px-1.5 py-0.5 font-mono text-[9px] font-bold text-gray-400 sm:inline-flex">
                Ctrl K
              </span>
            </button>

            <div className="flex shrink-0 items-center gap-2">
              <a
                href="/"
                target="_blank"
                rel="noreferrer"
                className="hidden h-9 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-xs font-bold text-gray-600 shadow-sm transition hover:border-orange-200 hover:text-accent-orange xl:inline-flex"
              >
                Store <ExternalLink className="h-3 w-3" />
              </a>
              <QuickCreate admin={admin} />
              <AdminLogout />
            </div>
          </div>
        </header>

        <main className="w-full flex-1">
          <div className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">{children}</div>
        </main>
      </div>

      {commandOpen && <CommandPalette admin={admin} onClose={() => setCommandOpen(false)} />}
    </div>
  );
}
