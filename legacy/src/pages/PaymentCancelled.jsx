// src/pages/PaymentCancelled.jsx
import {
  CheckCircle,
  Clock,
  Copy,
  Home,
  Loader2,
  MessageCircle,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../api/axios";
import { clearCheckoutData } from "../api/services/orders";
import { clearWalletCache } from "../api/services/wallet";
import uddoktaPayService from "../services/uddoktaPayService";

const SUPPORT_LINK = "https://www.facebook.com/gontopofficial";

const REASON_CONFIG = {
  cancelled: {
    icon: XCircle,
    color: "gray",
    title: "Payment Cancelled",
    subtitle: "You cancelled the payment",
  },
  user_cancelled: {
    icon: XCircle,
    color: "gray",
    title: "Payment Cancelled",
    subtitle: "You cancelled the payment",
  },
  failed: {
    icon: XCircle,
    color: "red",
    title: "Payment Failed",
    subtitle: "Payment could not be processed",
  },
  expired: {
    icon: Clock,
    color: "orange",
    title: "Session Expired",
    subtitle: "Your payment session has expired",
  },
  no_invoice: {
    icon: XCircle,
    color: "gray",
    title: "Session Not Found",
    subtitle: "Payment session could not be found",
  },
  blocked: {
    icon: XCircle,
    color: "red",
    title: "Access Denied",
    subtitle: "Too many attempts. Please wait.",
  },
};

const PaymentCancelled = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialized = useRef(false);
  const mountedRef = useRef(true);

  const reason = searchParams.get("reason") || "cancelled";
  const orderId = searchParams.get("order_id");
  const invoiceId = searchParams.get("invoice_id");

  const [status, setStatus] = useState("checking");
  const [recoveredOrder, setRecoveredOrder] = useState(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const cleanup = useCallback(() => {
    clearWalletCache();
    clearCheckoutData();
    ["last_order_id", "last_invoice_id", "last_payment_type"].forEach((k) =>
      localStorage.removeItem(k),
    );
  }, []);

  const copyToClipboard = useCallback((text) => {
    navigator.clipboard.writeText(String(text));
    toast.success("Copied!");
  }, []);

  const checkIfRecovered = useCallback(async () => {
    const checkOrderId = orderId || localStorage.getItem("last_order_id");
    const checkInvoice = invoiceId || localStorage.getItem("last_invoice_id");

    if (!checkOrderId && !checkInvoice) {
      if (mountedRef.current) setStatus("cancelled");
      return;
    }

    try {
      if (checkOrderId) {
        const { data } = await api.get(`/orders/${checkOrderId}`);
        if (data && ["processing", "completed"].includes(data.status)) {
          if (mountedRef.current) {
            setRecoveredOrder(data);
            setStatus("recovered");
          }
          return;
        }
      }

      if (checkInvoice) {
        const res = await uddoktaPayService.verifyPayment(checkInvoice);
        if (res.status === "COMPLETED") {
          if (mountedRef.current) {
            setRecoveredOrder({ id: res.order_id || checkOrderId });
            setStatus("recovered");
          }
          return;
        }
      }

      if (mountedRef.current) setStatus("cancelled");
    } catch {
      if (mountedRef.current) setStatus("cancelled");
    }
  }, [orderId, invoiceId]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const timer = setTimeout(checkIfRecovered, 1000);
    return () => clearTimeout(timer);
  }, [checkIfRecovered]);

  const handleRetryCheck = useCallback(async () => {
    setStatus("checking");
    await checkIfRecovered();
  }, [checkIfRecovered]);

  const handleGoToSuccess = useCallback(() => {
    const params = new URLSearchParams();
    if (recoveredOrder?.id || orderId)
      params.set("order_id", recoveredOrder?.id || orderId);
    if (invoiceId) params.set("invoice_id", invoiceId);
    navigate(`/checkout/success?${params.toString()}`, { replace: true });
  }, [navigate, recoveredOrder, orderId, invoiceId]);

  const handleTryAgain = useCallback(() => {
    cleanup();
    navigate("/");
  }, [cleanup, navigate]);

  const handleSupport = useCallback(() => {
    window.open(SUPPORT_LINK, "_blank");
  }, []);

  // ── CHECKING ──────────────────────────────────────────
  if (status === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary px-4">
        <div className="text-center">
          {/* Glowing spinner */}
          <div className="relative mx-auto mb-6 h-16 w-16">
            <div className="absolute inset-0 rounded-full border-4 border-accent-orange/10" />
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-accent-orange" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-accent-orange" />
            </div>
          </div>
          <p className="text-sm font-medium text-white/40">
            Checking order status...
          </p>
        </div>
      </div>
    );
  }

  // ── RECOVERED ─────────────────────────────────────────
  if (status === "recovered") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary px-4">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="rounded-2xl border border-accent-orange/20 bg-secondary/40 p-8 text-center shadow-2xl shadow-black/40 backdrop-blur-sm">
            {/* Glow */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-orange/40 to-transparent" />

            {/* Success Icon */}
            <div className="relative mx-auto mb-6 h-20 w-20">
              <div className="absolute inset-0 animate-ping rounded-full bg-accent-orange/15" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-accent-orange/30 bg-accent-orange/10">
                <CheckCircle className="h-10 w-10 text-accent-orange" />
              </div>
            </div>

            <h1 className="mb-2 text-2xl font-bold text-white">
              Payment Successful!
            </h1>
            <p className="mb-6 text-sm text-white/50">
              Your order was actually completed successfully.
            </p>

            {/* Order ID Badge */}
            {(recoveredOrder?.id || orderId) && (
              <div className="mb-6 rounded-xl border border-accent-orange/20 bg-accent-orange/10 p-4">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-accent-orange/60">
                  Order ID
                </p>
                <p className="text-2xl font-bold text-accent-orange">
                  #{recoveredOrder?.id || orderId}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={handleGoToSuccess}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-orange py-3 text-sm font-semibold text-white shadow-lg shadow-accent-orange/25 transition hover:opacity-90 active:scale-[0.98]"
              >
                <CheckCircle className="h-4 w-4" />
                View Order Details
              </button>
              <button
                onClick={() => navigate("/profile")}
                className="w-full rounded-xl border border-white/10 py-3 text-sm font-medium text-white/60 transition hover:border-accent-orange/30 hover:bg-accent-orange/5 hover:text-white"
              >
                View All Orders
              </button>
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-white/30">
            Need help?{" "}
            <button
              onClick={handleSupport}
              className="font-medium text-accent-orange hover:underline"
            >
              Contact our support team
            </button>
          </p>
        </div>
      </div>
    );
  }

  // ── CANCELLED / FAILED ────────────────────────────────
  const config = REASON_CONFIG[reason] || REASON_CONFIG.cancelled;
  const Icon = config.icon;

  const iconStyles = {
    gray: {
      wrap: "bg-white/5 border-white/10",
      icon: "text-white/40",
      title: "text-white/80",
      glow: "",
    },
    red: {
      wrap: "bg-red-500/10 border-red-500/20",
      icon: "text-red-400",
      title: "text-red-400",
      glow: "shadow-red-500/10",
    },
    orange: {
      wrap: "bg-accent-orange/10 border-accent-orange/20",
      icon: "text-accent-orange",
      title: "text-accent-orange",
      glow: "shadow-accent-orange/10",
    },
  };

  const styles = iconStyles[config.color] || iconStyles.gray;

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary px-4 py-8">
      <div className="w-full max-w-md">
        {/* Main Card */}
        <div
          className={`relative overflow-hidden rounded-2xl border border-white/10 bg-secondary/40 p-8 text-center shadow-2xl shadow-black/50 backdrop-blur-sm ${styles.glow}`}
        >
          {/* Top edge glow line */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-orange/30 to-transparent" />

          {/* Subtle radial glow behind icon */}
          <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 rounded-full bg-accent-orange/5 blur-3xl" />

          {/* Icon */}
          <div
            className={`relative mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border ${styles.wrap}`}
          >
            <Icon className={`h-10 w-10 ${styles.icon}`} />
          </div>

          {/* Title */}
          <h1 className={`mb-1 text-2xl font-bold ${styles.title}`}>
            {config.title}
          </h1>
          <p className="mb-6 text-sm text-white/40">{config.subtitle}</p>

          {/* Reference Info */}
          {(orderId || invoiceId) && (
            <div className="mb-4 rounded-xl border border-white/8 bg-white/5 p-4 text-left">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/30">
                Reference
              </p>

              {orderId && (
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-white/50">Order</span>
                  <div className="flex items-center gap-2">
                    <code className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-sm font-semibold text-white">
                      #{orderId}
                    </code>
                    <button
                      onClick={() => copyToClipboard(orderId)}
                      className="rounded-lg p-1.5 text-white/30 transition hover:bg-accent-orange/10 hover:text-accent-orange"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {invoiceId && (
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-white/50">Invoice</span>
                  <div className="flex items-center gap-2">
                    <code className="max-w-[130px] truncate rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-sm font-semibold text-white">
                      {invoiceId}
                    </code>
                    <button
                      onClick={() => copyToClipboard(invoiceId)}
                      className="rounded-lg p-1.5 text-white/30 transition hover:bg-accent-orange/10 hover:text-accent-orange"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Info Banner */}
          <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-accent-orange/15 bg-accent-orange/8 p-3.5 text-left">
            <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent-orange/20">
              <span className="text-[10px] font-bold text-accent-orange">i</span>
            </div>
            <p className="text-sm text-accent-orange/70">
              No amount was charged. You can safely try again.
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-2.5">
            {/* Recheck */}
            {(orderId || invoiceId) && (
              <button
                onClick={handleRetryCheck}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-accent-orange/30 py-3 text-sm font-medium text-accent-orange transition hover:bg-accent-orange/10 active:scale-[0.98]"
              >
                <RefreshCw className="h-4 w-4" />
                Check Again
              </button>
            )}

            {/* Try Again — Primary */}
            <button
              onClick={handleTryAgain}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-orange py-3 text-sm font-semibold text-white shadow-lg shadow-accent-orange/20 transition hover:opacity-90 active:scale-[0.98]"
            >
              Try Again
            </button>

            {/* Support */}
            <button
              onClick={handleSupport}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-3 text-sm font-medium text-white/50 transition hover:border-accent-orange/20 hover:bg-accent-orange/5 hover:text-white"
            >
              <MessageCircle className="h-4 w-4" />
              Contact Support
            </button>

            {/* Home */}
            <button
              onClick={() => {
                cleanup();
                navigate("/");
              }}
              className="flex w-full items-center justify-center gap-2 py-2.5 text-sm text-white/30 transition hover:text-accent-orange"
            >
              <Home className="h-4 w-4" />
              Go Home
            </button>
          </div>
        </div>

        {/* Bottom Note */}
        <p className="mt-4 text-center text-xs text-white/25">
          Need help?{" "}
          <button
            onClick={handleSupport}
            className="font-medium text-accent-orange hover:underline"
          >
            Contact our support team
          </button>
        </p>
      </div>
    </div>
  );
};

export default PaymentCancelled;