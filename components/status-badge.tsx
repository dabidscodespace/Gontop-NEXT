import { cn } from "@/lib/utils";

const STYLES: Record<string, { label: string; className: string; dot: string }> = {
  pending_payment: {
    label: "Pending Payment",
    className: "bg-amber-50 text-amber-700 ring-amber-200",
    dot: "bg-amber-500",
  },
  paid: {
    label: "Paid",
    className: "bg-blue-50 text-blue-700 ring-blue-200",
    dot: "bg-blue-500",
  },
  processing: {
    label: "Processing",
    className: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    dot: "bg-indigo-500",
  },
  completed: {
    label: "Completed",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    dot: "bg-emerald-500",
  },
  failed: {
    label: "Failed",
    className: "bg-red-50 text-red-700 ring-red-200",
    dot: "bg-red-500",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-gray-100 text-gray-600 ring-gray-200",
    dot: "bg-gray-400",
  },
  refunded: {
    label: "Refunded",
    className: "bg-purple-50 text-purple-700 ring-purple-200",
    dot: "bg-purple-500",
  },
  initiated: {
    label: "Initiated",
    className: "bg-gray-100 text-gray-600 ring-gray-200",
    dot: "bg-gray-400",
  },
  refund: {
    label: "Refund",
    className: "bg-purple-50 text-purple-700 ring-purple-200",
    dot: "bg-purple-500",
  },
  deposit: {
    label: "Deposit",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    dot: "bg-emerald-500",
  },
  on_hold: {
    label: "On hold",
    className: "bg-orange-50 text-orange-700 ring-orange-200",
    dot: "bg-orange-500",
  },
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const style =
    STYLES[status] ?? {
      label: status.replace(/_/g, " "),
      className: "bg-gray-100 text-gray-600 ring-gray-200",
      dot: "bg-gray-400",
    };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset",
        style.className,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
      {style.label}
    </span>
  );
}
