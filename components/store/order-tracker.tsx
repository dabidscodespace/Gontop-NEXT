"use client";

import { useRouter } from "next/navigation";
import { Check, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const TERMINAL = ["completed", "failed", "cancelled", "refunded"];

export function OrderTracker({
  publicId,
  initialStatus,
  invoiceId,
  pollingSeconds,
}: {
  publicId: string;
  initialStatus: string;
  invoiceId?: string;
  pollingSeconds: number;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");
  const checkingRef = useRef(false);

  const isTerminal = TERMINAL.includes(status);

  const check = useCallback(
    async (viaInvoice?: string) => {
      if (checkingRef.current) return;
      checkingRef.current = true;
      setChecking(true);
      setMessage("");
      try {
        const response = viaInvoice
          ? await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ invoice_id: viaInvoice }),
            })
          : await fetch(`/api/orders/${publicId}/verify`, { method: "POST" });

        const data = await response.json();
        if (!response.ok || !data.ok) {
          throw new Error(data.error || "Could not verify the payment yet.");
        }

        if (data.status === "PENDING") {
          setMessage("The gateway is still confirming your payment. This page will update.");
        } else if (data.status === "FAILED") {
          setMessage(data.message || "The payment was not completed. You can try again.");
        } else if (data.message) {
          setMessage(data.message);
        }

        const statusResponse = await fetch(`/api/orders/${publicId}/status`, {
          cache: "no-store",
        });
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          setStatus(statusData.status);
          if (data.status === "COMPLETED") {
            setMessage("Payment confirmed. Your order is being processed.");
          }
        }
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not check the payment.");
      } finally {
        checkingRef.current = false;
        setChecking(false);
      }
    },
    [publicId, router],
  );

  // Verify once when returning from the gateway with an invoice id.
  useEffect(() => {
    if (!invoiceId) return;
    const timer = window.setTimeout(() => void check(invoiceId), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Efficient polling: only while visible, stops at terminal status.
  useEffect(() => {
    if (isTerminal) return;
    let cancelled = false;

    const tick = async () => {
      if (cancelled || document.hidden) return;
      try {
        const response = await fetch(`/api/orders/${publicId}/status`, { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (data.status !== status) {
          setStatus(data.status);
          router.refresh();
        }
      } catch {
        // transient network error — next tick retries
      }
    };

    const interval = window.setInterval(tick, Math.max(3, pollingSeconds) * 1000);

    const onVisible = () => {
      if (!document.hidden) void tick();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [isTerminal, pollingSeconds, publicId, router, status]);

  if (isTerminal) {
    return (
      <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
        <Check className="h-3.5 w-3.5 text-emerald-500" />
        This order is final. Need help? Contact support from the About page.
      </div>
    );
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Live updates
        </span>

        {status === "pending_payment" && (
          <button
            onClick={() => void check()}
            disabled={checking}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-700 hover:border-orange-300 hover:text-orange-600 disabled:opacity-60"
          >
            {checking ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            Check payment
          </button>
        )}
      </div>

      {message && <p className="mt-2 text-xs text-gray-600">{message}</p>}
    </div>
  );
}
