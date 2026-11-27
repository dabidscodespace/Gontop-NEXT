"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function MobileNav() {
  const pathname = usePathname();

  const isActive = (path: string) =>
    path === "/" ? pathname === "/" : pathname.startsWith(path);

  const linkClass = (path: string) =>
    `flex h-12 w-12 items-center justify-center rounded-full transition ${
      isActive(path) ? "bg-orange-500 text-white shadow-md" : "text-gray-300 hover:text-white"
    }`;

  return (
    <div className="fixed bottom-6 left-1/2 z-50 flex w-70 -translate-x-1/2 items-center justify-between rounded-full bg-primary/70 px-6 py-3 shadow-lg backdrop-blur-md">
      <Link href="/" className={linkClass("/")} aria-label="Home">
        <img src="/home.png" alt="" />
      </Link>
      <Link href="/orders" className={linkClass("/orders")} aria-label="Orders">
        <img src="/order.png" alt="" />
      </Link>
      <Link href="/about" className={linkClass("/about")} aria-label="About">
        <img src="/about.png" alt="" />
      </Link>
    </div>
  );
}
