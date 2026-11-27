import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="w-full py-6 text-center text-sm text-gray-400">
      <div className="mb-2 flex flex-wrap items-center justify-center gap-3">
        <Link href="/about" className="transition-colors hover:text-accent-orange">
          User Agreement
        </Link>
        <span className="text-gray-300">|</span>
        <Link href="/about" className="transition-colors hover:text-accent-orange">
          Privacy Policy
        </Link>
        <span className="text-gray-300">|</span>
        <Link href="/about" className="transition-colors hover:text-accent-orange">
          Contact us
        </Link>
      </div>

      <p className="text-xs text-gray-400">
        Copyright © 2010 - {new Date().getFullYear()}{" "}
        <span className="font-semibold text-accent-orange">GONTOP</span>. All Rights Reserved
      </p>
    </footer>
  );
}
