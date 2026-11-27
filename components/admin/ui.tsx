import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/*
 * Shared admin primitives. Keeping management screens on these tokens makes the
 * CMS faster to scan and prevents one-off controls from drifting visually.
 */

export const inputCls =
  "h-11 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-900 shadow-[0_1px_2px_rgba(16,24,40,0.02)] outline-none transition placeholder:text-gray-400 hover:border-gray-300 focus:border-accent-orange focus:ring-4 focus:ring-accent-orange/10 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500";
export const selectCls =
  "h-11 w-full cursor-pointer rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-900 shadow-[0_1px_2px_rgba(16,24,40,0.02)] outline-none transition hover:border-gray-300 focus:border-accent-orange focus:ring-4 focus:ring-accent-orange/10 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500";
export const textareaCls =
  "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm leading-relaxed text-gray-900 shadow-[0_1px_2px_rgba(16,24,40,0.02)] outline-none transition placeholder:text-gray-400 hover:border-gray-300 focus:border-accent-orange focus:ring-4 focus:ring-accent-orange/10 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500";
export const labelCls = "mb-1.5 block text-xs font-bold text-gray-700";

export const btnPrimary =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-accent-orange px-4 text-sm font-bold text-white shadow-[0_6px_16px_rgba(249,96,0,0.18)] outline-none transition hover:-translate-y-px hover:bg-[#e95700] hover:shadow-[0_8px_20px_rgba(249,96,0,0.24)] focus-visible:ring-4 focus-visible:ring-accent-orange/20 active:translate-y-0 disabled:pointer-events-none disabled:opacity-50";
export const btnSecondary =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 text-sm font-bold text-gray-700 shadow-sm outline-none transition hover:-translate-y-px hover:border-gray-300 hover:bg-gray-50 focus-visible:ring-4 focus-visible:ring-gray-200 active:translate-y-0 disabled:pointer-events-none disabled:opacity-50";
export const btnDanger =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-3.5 text-sm font-bold text-red-600 shadow-sm outline-none transition hover:border-red-300 hover:bg-red-50 focus-visible:ring-4 focus-visible:ring-red-100 disabled:pointer-events-none disabled:opacity-50";

export const thCls =
  "whitespace-nowrap px-4 py-3.5 text-left text-[10px] font-black uppercase tracking-[0.12em] text-gray-500";
export const tdCls = "px-4 py-3.5 align-middle text-sm text-gray-700";

export type Crumb = { label: string; href?: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-2 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-gray-400">
      <Link href="/admin" className="transition hover:text-accent-orange">
        Admin
      </Link>
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="inline-flex items-center gap-1.5">
          <ChevronRight className="h-3 w-3 text-gray-300" aria-hidden="true" />
          {item.href ? (
            <Link href={item.href} className="transition hover:text-accent-orange">
              {item.label}
            </Link>
          ) : (
            <span className="font-bold text-gray-600" aria-current="page">
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
  eyebrow,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
  crumbs?: Crumb[];
  eyebrow?: string;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {crumbs && <Breadcrumbs items={crumbs} />}
        {back && (
          <Link
            href={back.href}
            className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 transition hover:text-accent-orange"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> {back.label}
          </Link>
        )}
        {eyebrow && (
          <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-accent-orange">{eyebrow}</p>
        )}
        <div className="flex items-center gap-3">
          <span className="hidden h-8 w-1 shrink-0 rounded-full bg-accent-orange sm:block" aria-hidden="true" />
          <h1 className="truncate text-[1.7rem] font-black leading-tight tracking-[-0.03em] text-gray-950 sm:text-3xl">
            {title}
          </h1>
        </div>
        {description && <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-gray-500 sm:ml-4">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
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
  title?: ReactNode;
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
        "rounded-2xl border border-gray-200/90 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.025),0_8px_24px_rgba(16,24,40,0.025)]",
        className,
      )}
    >
      {(title || actions) && (
        <header className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2.5 text-sm font-extrabold text-gray-900">
              {Icon && (
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-accent-orange ring-1 ring-inset ring-orange-100">
                  <Icon className="h-3.5 w-3.5" />
                </span>
              )}
              {title}
            </h2>
            {description && <p className={cn("mt-1 text-xs leading-relaxed text-gray-500", Icon && "ml-9.5")}>{description}</p>}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </header>
      )}
      <div className={padded ? "p-5" : undefined}>{children}</div>
    </section>
  );
}

const STAT_TONES = {
  orange: {
    icon: "bg-orange-50 text-orange-600 ring-orange-100",
    bar: "bg-accent-orange",
    glow: "from-orange-50/70",
  },
  emerald: {
    icon: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    bar: "bg-emerald-500",
    glow: "from-emerald-50/70",
  },
  blue: {
    icon: "bg-blue-50 text-blue-600 ring-blue-100",
    bar: "bg-blue-500",
    glow: "from-blue-50/70",
  },
  amber: {
    icon: "bg-amber-50 text-amber-600 ring-amber-100",
    bar: "bg-amber-500",
    glow: "from-amber-50/70",
  },
  violet: {
    icon: "bg-violet-50 text-violet-600 ring-violet-100",
    bar: "bg-violet-500",
    glow: "from-violet-50/70",
  },
  slate: {
    icon: "bg-gray-100 text-gray-600 ring-gray-200",
    bar: "bg-gray-500",
    glow: "from-gray-100/70",
  },
} as const;

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "orange",
  href,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: LucideIcon;
  tone?: keyof typeof STAT_TONES;
  href?: string;
}) {
  const colors = STAT_TONES[tone];
  const content = (
    <div
      className={cn(
        "group relative h-full overflow-hidden rounded-2xl border border-gray-200/90 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.025),0_8px_24px_rgba(16,24,40,0.02)] transition duration-200",
        href && "hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-[0_10px_30px_rgba(16,24,40,0.07)]",
      )}
    >
      <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b to-transparent opacity-70", colors.glow)} />
      <span className={cn("absolute inset-x-0 top-0 h-[2px]", colors.bar)} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-black uppercase tracking-[0.12em] text-gray-500">{label}</p>
          <p className="mt-2 truncate text-2xl font-black tracking-[-0.03em] text-gray-950">{value}</p>
          {hint && <p className="mt-1 truncate text-xs font-medium text-gray-500">{hint}</p>}
        </div>
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset", colors.icon)}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </div>
  );

  return href ? (
    <Link href={href} className="block h-full rounded-2xl outline-none focus-visible:ring-4 focus-visible:ring-accent-orange/15">
      {content}
    </Link>
  ) : (
    content
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 text-gray-400 shadow-sm">
        <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-orange-100 ring-2 ring-white" />
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-4 text-sm font-extrabold text-gray-800">{title}</p>
      {description && <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-gray-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
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
      {hint && <p className="mt-1.5 text-[11px] leading-relaxed text-gray-400">{hint}</p>}
    </div>
  );
}

function paginationItems(page: number, pageCount: number): Array<number | "ellipsis-left" | "ellipsis-right"> {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1);
  const pages = new Set([1, pageCount, page - 1, page, page + 1]);
  const sorted = [...pages].filter((value) => value >= 1 && value <= pageCount).sort((a, b) => a - b);
  const result: Array<number | "ellipsis-left" | "ellipsis-right"> = [];
  sorted.forEach((value, index) => {
    const previous = sorted[index - 1];
    if (previous && value - previous > 1) result.push(previous === 1 ? "ellipsis-left" : "ellipsis-right");
    result.push(value);
  });
  return result;
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
  const items = paginationItems(page, pageCount);

  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-center gap-1.5 py-2 text-sm">
      <Link
        href={buildHref(Math.max(1, page - 1))}
        aria-disabled={page <= 1}
        tabIndex={page <= 1 ? -1 : undefined}
        className={cn(
          "flex h-9 items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-bold text-gray-600 shadow-sm transition hover:border-gray-300 hover:bg-gray-50",
          page <= 1 && "pointer-events-none opacity-40",
        )}
      >
        <ChevronLeft className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Previous</span>
      </Link>
      {items.map((item) =>
        typeof item === "number" ? (
          <Link
            key={item}
            href={buildHref(item)}
            aria-current={item === page ? "page" : undefined}
            className={cn(
              "flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-xs font-bold transition",
              item === page
                ? "border-accent-orange bg-accent-orange text-white shadow-sm shadow-orange-500/20"
                : "border-gray-200 bg-white text-gray-600 shadow-sm hover:border-gray-300 hover:bg-gray-50",
            )}
          >
            {item}
          </Link>
        ) : (
          <span key={item} className="flex h-9 w-7 items-center justify-center text-xs font-bold text-gray-400">
            ···
          </span>
        ),
      )}
      <Link
        href={buildHref(Math.min(pageCount, page + 1))}
        aria-disabled={page >= pageCount}
        tabIndex={page >= pageCount ? -1 : undefined}
        className={cn(
          "flex h-9 items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-bold text-gray-600 shadow-sm transition hover:border-gray-300 hover:bg-gray-50",
          page >= pageCount && "pointer-events-none opacity-40",
        )}
      >
        <span className="hidden sm:inline">Next</span> <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </nav>
  );
}

export function SearchBar({
  defaultValue,
  placeholder,
  children,
  resetHref,
  submitLabel = "Search",
}: {
  defaultValue?: string;
  placeholder: string;
  children?: ReactNode;
  resetHref?: string;
  submitLabel?: string;
}) {
  return (
    <form className="rounded-2xl border border-gray-200/90 bg-white p-2 shadow-[0_1px_2px_rgba(16,24,40,0.025)]">
      <div className="flex flex-wrap gap-2">
        <label className="relative min-w-[220px] flex-[1_1_280px]">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <span className="sr-only">Search</span>
          <input
            name="q"
            defaultValue={defaultValue ?? ""}
            placeholder={placeholder}
            className="h-11 w-full rounded-xl border border-transparent bg-gray-50 pl-10 pr-3 text-sm font-medium text-gray-900 outline-none transition placeholder:font-normal placeholder:text-gray-400 hover:bg-gray-100/80 focus:border-accent-orange/30 focus:bg-white focus:ring-4 focus:ring-accent-orange/10"
          />
        </label>
        {children}
        <button type="submit" className={cn(btnPrimary, "h-11 min-w-[92px]")}>
          <SlidersHorizontal className="h-3.5 w-3.5" /> {submitLabel}
        </button>
        {resetHref && (
          <Link href={resetHref} className={cn(btnSecondary, "h-11")}>
            Reset
          </Link>
        )}
      </div>
    </form>
  );
}
