"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  HelpCircle,
  LogOut,
  Plus,
  Search,
  Settings,
  ShoppingBag,
  User,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

import { SearchDialog } from "@/components/store/search-dialog";
import type { SessionUser } from "@/lib/auth";

function formatCoin(amount: number) {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 10_000) return `${(amount / 1_000).toFixed(1)}K`;
  return Math.floor(amount).toLocaleString();
}

export function Header({
  user,
  balance,
  supportUrl,
}: {
  user: SessionUser | null;
  balance: number;
  supportUrl: string;
}) {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const timer = requestAnimationFrame(() => setAnimating(true));
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(timer);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  function openMenu() {
    setMenuOpen(true);
  }

  function closeMenu() {
    setAnimating(false);
    window.setTimeout(() => setMenuOpen(false), 250);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setMenuOpen(false);
    router.push("/");
    router.refresh();
  }

  const menuItems = [
    { icon: Wallet, label: "G Coin", href: "/wallet", subtitle: `${formatCoin(balance)} coins` },
    { icon: ShoppingBag, label: "Orders", href: "/orders" },
    { icon: Settings, label: "Account", href: "/account" },
    { icon: HelpCircle, label: "Support", href: supportUrl, external: true },
  ];

  return (
    <>
      <div className="sticky top-0 z-50 w-full bg-primary">
        <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-3 py-2">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center text-lg font-bold text-accent-orange">
              <img src="/logo.png" alt="GONTOP logo" className="h-12" />
            </Link>
            <span className="hidden text-lg font-normal italic text-white md:block">
              Great deals are guaranteed!
            </span>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden h-10 cursor-pointer items-center gap-2 rounded-lg bg-secondary px-3 text-white/70 transition-colors hover:bg-secondary/80 hover:text-white md:flex"
            >
              <Search className="h-4 w-4" />
              <span className="text-sm">Search games...</span>
            </button>

            <button
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg bg-secondary text-white/70 transition-colors hover:bg-secondary/80 hover:text-white md:hidden"
            >
              <Search className="h-5 w-5" />
            </button>

            {user ? (
              <button
                onClick={openMenu}
                className="hidden h-10 cursor-pointer items-center gap-2 rounded-full bg-secondary px-3 transition-colors hover:bg-secondary/80 md:flex"
              >
                <span className="text-sm font-bold text-white">{formatCoin(balance)}</span>
                <img src="/coin.png" alt="coin" className="h-7 w-7 object-contain" />
              </button>
            ) : (
              <div className="hidden h-10 items-center justify-end gap-2 rounded-full bg-secondary px-3 md:flex">
                <span className="text-sm font-bold text-white">0</span>
                <img src="/coin.png" alt="coin" className="h-7 w-7 object-contain" />
              </div>
            )}

            {user ? (
              <button
                onClick={openMenu}
                aria-label="Account menu"
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg bg-secondary transition-colors hover:bg-secondary/80 md:w-auto md:gap-2 md:px-2"
              >
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-orange">
                    <User className="h-4 w-4 text-white" />
                  </div>
                )}
                <span className="hidden max-w-[100px] truncate text-sm font-medium text-white md:block">
                  {user.name || user.email.split("@")[0]}
                </span>
              </button>
            ) : (
              <Link
                href="/login"
                className="flex h-10 items-center rounded-lg border border-accent-orange bg-accent-orange px-4 text-sm font-medium text-white transition-colors hover:bg-accent-orange/90"
              >
                Login
              </Link>
            )}
          </div>
        </nav>
      </div>

      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />

      {menuOpen && (
        <>
          <div
            onClick={closeMenu}
            className={`fixed inset-0 z-[998] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
              animating ? "opacity-100" : "opacity-0"
            }`}
          />

          <div
            className={`fixed inset-y-0 right-0 z-[999] flex w-75 max-w-[85vw] flex-col bg-primary shadow-2xl transition-transform duration-300 ease-out md:hidden ${
              animating ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <Link href="/" onClick={closeMenu}>
                <img src="/logo.png" alt="GONTOP" className="h-10" />
              </Link>
              <button
                onClick={closeMenu}
                aria-label="Close menu"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="border-b border-white/10 p-4">
              <div className="flex items-center gap-3">
                {user?.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="h-14 w-14 rounded-full object-cover ring-2 ring-accent-orange"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-orange">
                    <User className="h-7 w-7 text-white" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-semibold text-white">{user?.name || "User"}</p>
                  <p className="truncate text-sm text-white/60">{user?.email}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-xl bg-gradient-to-r from-accent-orange/20 to-yellow-500/20 p-3">
                <div className="flex items-center gap-2">
                  <img src="/coin.png" alt="G Coin" className="h-10 w-10 object-contain" />
                  <div>
                    <p className="text-xs text-white/60">G Coin Balance</p>
                    <p className="text-lg font-bold leading-none text-white">
                      {formatCoin(balance)} <span className="text-xs font-normal text-white/50">coins</span>
                    </p>
                  </div>
                </div>
                <Link
                  href="/wallet"
                  onClick={closeMenu}
                  className="flex items-center gap-1 rounded-lg bg-accent-orange px-3 py-2 text-sm font-medium text-white hover:bg-accent-orange/90"
                >
                  <Plus className="h-3.5 w-3.5" /> Top Up
                </Link>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-2">
              {menuItems.map((item) => {
                const content = (
                  <>
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{item.label}</p>
                      {item.subtitle && <p className="text-xs text-white/50">{item.subtitle}</p>}
                    </div>
                    <ChevronRight className="h-4 w-4 text-white/40" />
                  </>
                );
                return item.external ? (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    onClick={closeMenu}
                    className="flex items-center gap-3 px-4 py-3.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    {content}
                  </a>
                ) : (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={closeMenu}
                    className="flex items-center gap-3 px-4 py-3.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    {content}
                  </Link>
                );
              })}
            </div>

            <div className="border-t border-white/10 p-4">
              <button
                onClick={logout}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/20 py-3.5 font-medium text-red-400 transition-colors hover:bg-red-500/30"
              >
                <LogOut className="h-5 w-5" /> Logout
              </button>
            </div>
          </div>

          <div
            className={`fixed right-4 top-16 z-[999] hidden transition-all duration-300 ease-out md:block ${
              animating
                ? "translate-y-0 scale-100 opacity-100"
                : "pointer-events-none -translate-y-4 scale-95 opacity-0"
            }`}
          >
            <div className="w-105 overflow-hidden rounded-2xl border border-white/10 bg-primary shadow-2xl">
              <div className="border-b border-white/10 p-5">
                <div className="flex items-center gap-4">
                  {user?.picture ? (
                    <img
                      src={user.picture}
                      alt={user.name}
                      className="h-16 w-16 rounded-full object-cover ring-2 ring-accent-orange"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-orange">
                      <User className="h-8 w-8 text-white" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-bold text-white">{user?.name || "User"}</p>
                    <p className="truncate text-sm text-white/60">{user?.email}</p>
                  </div>
                  <button
                    onClick={closeMenu}
                    aria-label="Close menu"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="mt-4 flex items-center justify-between rounded-xl bg-gradient-to-r from-accent-orange/20 to-yellow-500/20 p-3">
                  <div className="flex items-center gap-2">
                    <img src="/coin.png" alt="G Coin" className="h-10 w-10 object-contain" />
                    <div>
                      <p className="text-xs text-white/60">G Coin Balance</p>
                      <p className="text-lg font-bold leading-none text-white">
                        {formatCoin(balance)}{" "}
                        <span className="text-xs font-normal text-white/50">coins</span>
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/wallet"
                    onClick={closeMenu}
                    className="flex items-center gap-1 rounded-lg bg-accent-orange px-3 py-2 text-sm font-medium text-white hover:bg-accent-orange/90"
                  >
                    <Plus className="h-3.5 w-3.5" /> Top Up
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 p-4">
                {menuItems.map((item) => {
                  const content = (
                    <>
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 transition-colors group-hover:bg-accent-orange/20">
                        <item.icon className="h-6 w-6 text-white/70 transition-colors group-hover:text-accent-orange" />
                      </div>
                      <span className="text-sm font-medium text-white/80">{item.label}</span>
                    </>
                  );
                  return item.external ? (
                    <a
                      key={item.label}
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      onClick={closeMenu}
                      className="group flex flex-col items-center gap-2 rounded-xl bg-white/5 p-4 transition-all hover:bg-white/10"
                    >
                      {content}
                    </a>
                  ) : (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={closeMenu}
                      className="group flex flex-col items-center gap-2 rounded-xl bg-white/5 p-4 transition-all hover:bg-white/10"
                    >
                      {content}
                    </Link>
                  );
                })}
              </div>

              <div className="border-t border-white/10 p-4">
                <button
                  onClick={logout}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/20 py-3 font-medium text-red-400 transition-colors hover:bg-red-500/30"
                >
                  <LogOut className="h-5 w-5" /> Logout
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
