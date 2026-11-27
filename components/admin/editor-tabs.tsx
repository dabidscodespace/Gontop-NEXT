"use client";

import { Children, useState, type KeyboardEvent, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export type EditorTab = {
  id: string;
  label: string;
  count?: number;
  disabled?: boolean;
};

/** Keeps every panel mounted so unsaved form values survive tab changes. */
export function EditorTabs({
  tabs,
  initialTab,
  children,
  ariaLabel,
  syncQuery = false,
  compact = false,
  idPrefix = "editor",
}: {
  tabs: EditorTab[];
  initialTab?: string;
  children: ReactNode;
  ariaLabel: string;
  syncQuery?: boolean;
  compact?: boolean;
  idPrefix?: string;
}) {
  const firstEnabled = tabs.find((tab) => !tab.disabled)?.id ?? tabs[0]?.id ?? "";
  const requested = tabs.find((tab) => tab.id === initialTab && !tab.disabled)?.id;
  const [active, setActive] = useState(requested ?? firstEnabled);
  const panels = Children.toArray(children);

  const choose = (id: string) => {
    const tab = tabs.find((item) => item.id === id);
    if (!tab || tab.disabled) return;
    setActive(id);
    if (syncQuery && typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", id);
      window.history.replaceState(window.history.state, "", `${url.pathname}?${url.searchParams.toString()}${url.hash}`);
    }
  };

  const move = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    for (let step = 1; step <= tabs.length; step += 1) {
      const next = (index + direction * step + tabs.length) % tabs.length;
      if (!tabs[next].disabled) {
        choose(tabs[next].id);
        document.getElementById(`${idPrefix}-tab-${tabs[next].id}`)?.focus();
        break;
      }
    }
  };

  return (
    <div className="min-w-0">
      <div className={cn("overflow-x-auto", compact ? "border-b border-gray-100" : "sticky top-[72px] z-20 rounded-2xl border border-gray-200 bg-white/95 p-1.5 shadow-sm backdrop-blur")}>
        <div role="tablist" aria-label={ariaLabel} className="flex min-w-max items-center gap-1">
          {tabs.map((tab, index) => {
            const selected = active === tab.id;
            return (
              <button
                key={tab.id}
                id={`${idPrefix}-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`${idPrefix}-panel-${tab.id}`}
                tabIndex={selected ? 0 : -1}
                disabled={tab.disabled}
                onClick={() => choose(tab.id)}
                onKeyDown={(event) => move(event, index)}
                className={cn(
                  "inline-flex shrink-0 items-center justify-center gap-2 font-extrabold outline-none transition focus-visible:ring-4 focus-visible:ring-orange-100 disabled:cursor-not-allowed disabled:opacity-40",
                  compact ? "h-11 border-b-2 px-4 text-xs" : "h-10 rounded-xl px-4 text-sm",
                  compact
                    ? selected ? "border-accent-orange text-accent-orange" : "border-transparent text-gray-500 hover:text-gray-900"
                    : selected ? "bg-gray-950 text-white shadow-sm" : "text-gray-600 hover:bg-gray-50 hover:text-gray-950",
                )}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-black", selected ? compact ? "bg-orange-50 text-accent-orange" : "bg-white/15 text-white" : "bg-gray-100 text-gray-500")}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {panels.map((panel, index) => {
        const tab = tabs[index];
        if (!tab) return null;
        const selected = active === tab.id;
        return (
          <div key={tab.id} id={`${idPrefix}-panel-${tab.id}`} role="tabpanel" aria-labelledby={`${idPrefix}-tab-${tab.id}`} hidden={!selected} className={cn(!compact && "mt-5")}>
            {panel}
          </div>
        );
      })}
    </div>
  );
}
