"use client";

import { useRouter } from "next/navigation";
import { CreditCard, Loader2, XCircle } from "lucide-react";
import { useState } from "react";

export function OrderActions({
  publicId,
  canRetryPayment,
}: {
  publicId: string;
  canRetryPayment: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"pay" | "cancel" | null>(null);
  const [error, setError] = useState("");

  async function pay() {
    setLoading("pay");
    setError("");
    try {
      const response = await fetch(`/api/orders/${publicId}/pay`, { method: "POST" });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not start payment.");
      window.location.href = data.paymentUrl;
    } catch (payError) {
      setError(payError instanceof Error ? payError.message : "Could not start payment.");
      setLoading(null);
    }
  }

  async function cancel() {
    if (!window.confirm("Cancel this order and release any G Coin used?")) return;
    setLoading("cancel");
    setError("");
    try {
      const response = await fetch(`/api/orders/${publicId}/cancel`, { method: "POST" });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not cancel the order.");
      router.refresh();
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "Could not cancel the order.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        {canRetryPayment && (
          <button
            onClick={pay}
            disabled={loading !== null}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent-orange px-3 py-2 text-xs font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
          >
            {loading === "pay" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CreditCard className="h-3.5 w-3.5" />
            )}
            Pay now
          </button>
        )}
        <button
          onClick={cancel}
          disabled={loading !== null}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:border-red-300 hover:text-red-600 disabled:opacity-60"
        >
          {loading === "cancel" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <XCircle className="h-3.5 w-3.5" />
          )}
          Cancel order
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </div>
  );
}
