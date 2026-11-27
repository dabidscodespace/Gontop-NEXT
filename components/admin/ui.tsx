import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/* Shared admin design tokens. Keep every admin screen on these so the CMS feels like one product. */

export const inputCls =
  "h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 transition focus:border-accent-orange focus:outline-none focus:ring-4 focus:ring-accent-orange/15";
export const selectCls =
  "h-10 w-full cursor-pointer rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 transition focus:border-accent-orange focus:outline-none focus:ring-4 focus:ring-accent-orange/15";
export const textareaCls =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition focus:border-accent-orange focus:outline-none focus:ring-4 focus:ring-accent-orange/15";
export const labelCls = "mb-1.5 block text-xs font-semibold text-gray-600";

export const btnPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-xl bg-accent-orange px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-orange-500/20 transition hover:bg-orange-600 active:scale-[0.98]";
export const btnSecondary =
  "inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50";
export const btnDanger =
  "inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-white px-3.5 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50";

export const thCls =
  "whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500";
export const tdCls = "px-4 py-3 align-middle text-sm text-gray-700";

export type Crumb = { label: string; href?: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-1.5 flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="inline-flex items-center gap-1.5">
          {index > 0 && <span aria-hidden="true" className="text-gray-300">/</span>}
          {item.href ? (
            <Link href={item.href} className="font-semibold transition hover:text-accent-orange">
              {item.label}
            </Link>
          ) : (
            <span className="font-semibold text-gray-700" aria-current="page">
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  back,
  crumbs,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
  crumbs?: Crumb[];
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {crumbs && <Breadcrumbs items={crumbs} />}
        {back && (
          <Link
            href={back.href}
            className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-gray-500 transition hover:text-accent-orange"
          >
            ← {back.label}
          </Link>
        )}
        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({
  title,
  description,
  icon: Icon,
  actions,
  children,
  className,
  padded = true,
}: {
  title?: string;
  description?: ReactNode;
  icon?: LucideIcon;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-gray-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]",
        className,
      )}
    >
      {(title || actions) && (
        <header className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900">
              {Icon && <Icon className="h-4 w-4 text-accent-orange" />}
              {title}
            </h2>
            {description && <p className="mt-0.5 text-xs text-gray-500">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className={padded ? "p-5" : undefined}>{children}</div>
    </section>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "orange",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: LucideIcon;
  tone?: "orange" | "emerald" | "blue" | "amber" | "violet" | "slate";
}) {
  const tones: Record<string, string> = {
    orange: "bg-orange-50 text-orange-600 ring-orange-100",
    emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    blue: "bg-blue-50 text-blue-600 ring-blue-100",
    amber: "bg-amber-50 text-amber-600 ring-amber-100",
    violet: "bg-violet-50 text-violet-600 ring-violet-100",
    slate: "bg-gray-100 text-gray-600 ring-gray-200",
  };
  return (
    <div className="group rounded-2xl border border-gray-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
        <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl ring-1", tones[tone])}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-extrabold tracking-tight text-gray-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-3 text-sm font-semibold text-gray-800">{title}</p>
      {description && <p className="mt-1 max-w-sm text-xs text-gray-500">{description}</p>}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className={labelCls}>{label}</label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-gray-400">{hint}</p>}
    </div>
  );
}

export function Pagination({
  page,
  pageCount,
  buildHref,
}: {
  page: number;
  pageCount: number;
  buildHref: (page: number) => string;
}) {
  if (pageCount <= 1) return null;
  return (
    <nav className="flex items-center justify-center gap-1.5 pt-2 text-sm">
      {Array.from({ length: pageCount }, (_, index) => index + 1).map((p) => (
        <Link
          key={p}
          href={buildHref(p)}
          className={cn(
            "min-w-9 rounded-lg px-3 py-1.5 text-center font-semibold transition",
            p === page
              ? "bg-accent-orange text-white shadow-sm shadow-orange-500/30"
              : "border border-gray-200 bg-white text-gray-600 hover:border-gray-300",
          )}
        >
          {p}
        </Link>
      ))}
    </nav>
  );
}

export function SearchBar({
  defaultValue,
  placeholder,
  children,
}: {
  defaultValue?: string;
  placeholder: string;
  children?: ReactNode;
}) {
  return (
    <form className="flex flex-wrap gap-2 rounded-2xl border border-gray-200/80 bg-white p-2 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <input
        name="q"
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className="h-10 min-w-[200px] flex-1 rounded-xl border-0 bg-gray-50 px-3 text-sm placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-accent-orange/15"
      />
      {children}
      <button type="submit" className={cn(btnPrimary, "h-10")}>
        Search
      </button>
    </form>
  );
}
