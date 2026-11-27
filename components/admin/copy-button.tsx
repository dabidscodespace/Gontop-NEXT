"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

export function CopyButton({
  value,
  compact = false,
  label = "Copy",
  className,
}: {
  value: string;
  compact?: boolean;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        } catch {
          setCopied(false);
        }
      }}
      aria-label={`${copied ? "Copied" : label}: ${value}`}
      title={copied ? "Copied" : label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white text-xs font-bold text-gray-500 shadow-sm transition hover:border-orange-200 hover:text-accent-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-orange/20",
        compact ? "h-7 w-7 p-0" : "px-2.5 py-1.5",
        className,
      )}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
      {!compact && (copied ? "Copied" : label)}
    </button>
  );
}
