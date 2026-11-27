import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type WorkspaceItem = {
  key: string;
  label: string;
  description?: string;
  href: string;
  icon?: LucideIcon;
  badge?: ReactNode;
};

const ACTIVE_TONES = {
  dark: "bg-gray-950 text-white shadow-sm",
  orange: "bg-orange-600 text-white shadow-sm shadow-orange-500/20",
  emerald: "bg-emerald-600 text-white shadow-sm shadow-emerald-500/20",
  teal: "bg-teal-600 text-white shadow-sm shadow-teal-500/20",
  violet: "bg-violet-600 text-white shadow-sm shadow-violet-500/20",
  indigo: "bg-indigo-600 text-white shadow-sm shadow-indigo-500/20",
} as const;

/** Local section navigation only. Cross-page navigation belongs in the sidebar. */
export function WorkspaceNav({
  label,
  items,
  active,
  compact = false,
  tone = "dark",
}: {
  label: string;
  items: WorkspaceItem[];
  active: string;
  compact?: boolean;
  tone?: keyof typeof ACTIVE_TONES;
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
              current ? ACTIVE_TONES[tone] : "text-gray-600 hover:bg-gray-50 hover:text-gray-950",
            )}
          >
            {Icon && (
              <span
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-lg",
                  compact ? "h-6 w-6" : "h-8 w-8",
                  current
                    ? "bg-white/15 text-white"
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
                  <span className={cn("rounded-md px-1.5 py-0.5 text-[9px] font-black tabular-nums", current ? "bg-white/15 text-white/80" : "bg-gray-100 text-gray-500")}>{item.badge}</span>
                )}
              </span>
              {!compact && item.description && (
                <span className={cn("mt-0.5 block truncate text-[10px] font-medium", current ? "text-white/65" : "text-gray-400")}>{item.description}</span>
              )}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
