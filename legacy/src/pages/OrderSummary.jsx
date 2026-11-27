// src/pages/OrderSummary.jsx
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  ExternalLink,
  Gamepad2,
  HeadphonesIcon,
  Home,
  Loader2,
  Mail,
  MessageCircle,
  Package,
  Phone,
  Receipt,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Star,
  User,
  Wallet,
  XCircle,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../api/axios";
import { clearCheckoutData } from "../api/services/orders";
import { clearWalletCache } from "../api/services/wallet";
import uddoktaPayService from "../services/uddoktaPayService";

const MAX_RETRIES = 8;
const RETRY_DELAY = 2000;
const MAX_WAIT = 50000;
const SUPPORT_LINK = "https://www.facebook.com/gontopofficial";

const STATUS = {
  LOADING: "loading",
  SUCCESS: "success",
  ON_HOLD: "on_hold",
  FAILED: "failed",
};

const formatPrice = (v) => parseFloat(v || 0).toFixed(2);

const safeString = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return value.toString();
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }
  return String(value);
};

// ─── Animated Background Orbs ──────────────────────────
function BackgroundOrbs({ variant = "success" }) {
  const colors = {
    success: {
      primary: "bg-accent-orange",
      secondary: "bg-amber-500",
      tertiary: "bg-orange-600",
    },
    failed: {
      primary: "bg-red-500",
      secondary: "bg-rose-600",
      tertiary: "bg-red-700",
    },
    hold: {
      primary: "bg-accent-orange",
      secondary: "bg-yellow-500",
      tertiary: "bg-amber-600",
    },
  };
  const c = colors[variant];
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <div
        className={`absolute -left-32 -top-32 h-96 w-96 rounded-full ${c.primary}/[0.06] blur-[120px] animate-pulse`}
        style={{ animationDuration: "4s" }}
      />
      <div
        className={`absolute -right-32 top-1/3 h-80 w-80 rounded-full ${c.secondary}/[0.04] blur-[100px] animate-pulse`}
        style={{ animationDuration: "6s", animationDelay: "2s" }}
      />
      <div
        className={`absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full ${c.tertiary}/[0.05] blur-[80px] animate-pulse`}
        style={{ animationDuration: "5s", animationDelay: "1s" }}
      />
      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />
    </div>
  );
}

// ─── Floating Particles ────────────────────────────────
function Particles() {
  const particles = Array.from({ length: 12 });
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      {particles.map((_, i) => (
        <div
          key={i}
          className="absolute h-1 w-1 rounded-full bg-accent-orange/30 animate-float"
          style={{
            left: `${10 + i * 7.5}%`,
            top: `${20 + ((i * 37) % 60)}%`,
            animationDelay: `${i * 0.4}s`,
            animationDuration: `${3 + (i % 3)}s`,
            transform: `scale(${0.5 + (i % 3) * 0.5})`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Confetti ──────────────────────────────────────────
function Confetti() {
  const pieces = Array.from({ length: 20 });
  const colors = [
    "bg-accent-orange",
    "bg-amber-400",
    "bg-yellow-500",
    "bg-orange-400",
    "bg-white/40",
  ];
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      {pieces.map((_, i) => (
        <div
          key={i}
          className={`absolute rounded-sm ${colors[i % colors.length]} animate-confetti`}
          style={{
            left: `${5 + i * 4.5}%`,
            top: "-10px",
            width: `${4 + (i % 4) * 2}px`,
            height: `${6 + (i % 3) * 3}px`,
            animationDelay: `${i * 0.15}s`,
            animationDuration: `${2.5 + (i % 4) * 0.5}s`,
            transform: `rotate(${i * 17}deg)`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Glass Card ────────────────────────────────────────
function GlassCard({ children, className = "", glow = false, accent = false }) {
  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl
        border border-white/[0.08]
        bg-white/[0.03] backdrop-blur-sm
        ${glow ? "shadow-[0_0_40px_rgba(255,100,0,0.08)]" : ""}
        ${accent ? "border-accent-orange/20 bg-accent-orange/[0.03]" : ""}
        ${className}
      `}
    >
      {/* Top shimmer line */}
      <div
        className={`absolute inset-x-0 top-0 h-px ${accent ? "bg-gradient-to-r from-transparent via-accent-orange/60 to-transparent" : "bg-gradient-to-r from-transparent via-white/10 to-transparent"}`}
      />
      {children}
    </div>
  );
}

// ─── Section Card ──────────────────────────────────────
function SectionCard({ icon: Icon, title, badge, accent, children }) {
  return (
    <GlassCard accent={accent} glow={accent}>
      <div
        className={`flex items-center justify-between px-5 py-3.5 ${
          accent
            ? "border-b border-accent-orange/10"
            : "border-b border-white/[0.05]"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-xl ${accent ? "bg-accent-orange/15 ring-1 ring-accent-orange/20" : "bg-white/[0.06] ring-1 ring-white/[0.08]"}`}
          >
            <Icon
              className={`h-4 w-4 ${accent ? "text-accent-orange" : "text-white/50"}`}
            />
          </div>
          <span className="text-sm font-semibold tracking-tight text-white">
            {title}
          </span>
        </div>
        {badge}
      </div>
      <div className="px-5 py-4">{children}</div>
    </GlassCard>
  );
}

// ─── Info Row ──────────────────────────────────────────
function InfoRow({
  label,
  value,
  fieldId,
  mono,
  icon: Icon,
  copiedField,
  onCopy,
}) {
  const display = safeString(value);
  if (!display || display.startsWith("{") || display.startsWith("["))
    return null;
  const copied = copiedField === fieldId;

  return (
    <div className="flex items-center justify-between py-3 group">
      <span className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-widest text-white/25">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </span>
      <div className="flex items-center gap-2">
        <span
          className={`text-[13px] text-white/75 ${mono ? "font-mono tracking-tight" : "font-medium"}`}
        >
          {display}
        </span>
        {onCopy && (
          <button
            onClick={() => onCopy(display, fieldId, `${label} copied!`)}
            className={`rounded-lg p-1.5 transition-all duration-200 ${
              copied
                ? "bg-accent-orange/20 text-accent-orange"
                : "text-white/15 hover:bg-white/[0.06] hover:text-accent-orange opacity-0 group-hover:opacity-100"
            }`}
          >
            {copied ? (
              <Check className="h-3 w-3" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Static Row ────────────────────────────────────────
function StaticRow({ label, value, highlight }) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-[12px] font-medium uppercase tracking-widest text-white/25">
        {label}
      </span>
      <span
        className={`text-[13px] font-medium ${highlight ? "text-accent-orange" : "text-white/75"}`}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Primary Button ────────────────────────────────────
function PrimaryButton({ onClick, children, icon: Icon }) {
  return (
    <button
      onClick={onClick}
      className="group relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl py-4 text-sm font-bold text-white shadow-xl shadow-accent-orange/20 transition-all duration-300 hover:shadow-accent-orange/30 active:scale-[0.98]"
    >
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-orange-500 via-accent-orange to-amber-500" />
      {/* Shimmer */}
      <div className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-[100%]" />
      {/* Content */}
      <div className="relative flex items-center gap-2.5">
        {Icon && <Icon className="h-4 w-4" />}
        {children}
      </div>
    </button>
  );
}

// ─── Outline Button ────────────────────────────────────
function OutlineButton({ onClick, children, icon: Icon, accent }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-center gap-2 rounded-2xl border py-3.5 text-sm font-semibold transition-all duration-200 active:scale-[0.98] ${
        accent
          ? "border-accent-orange/25 bg-accent-orange/[0.04] text-accent-orange hover:bg-accent-orange/10 hover:border-accent-orange/40"
          : "border-white/[0.07] bg-white/[0.02] text-white/40 hover:bg-white/[0.05] hover:text-white hover:border-white/[0.12]"
      }`}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {children}
    </button>
  );
}

// ─── Half Button ───────────────────────────────────────
function HalfButton({ onClick, children, icon: Icon }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] py-3 text-[13px] font-medium text-white/35 transition-all duration-200 hover:bg-white/[0.05] hover:text-white hover:border-white/10 active:scale-[0.98]"
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}

// ═══════════════════════════════════════════════════════
const OrderSummary = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialized = useRef(false);
  const retries = useRef(0);
  const startTime = useRef(null);
  const timeoutRef = useRef(null);

  const [status, setStatus] = useState(STATUS.LOADING);
  const [message, setMessage] = useState("Verifying payment...");
  const [order, setOrder] = useState(null);
  const [payment, setPayment] = useState(null);
  const [productImage, setProductImage] = useState(null);
  const [progress, setProgress] = useState({ retries: 0, elapsed: 0 });
  const [copiedField, setCopiedField] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const invoiceId = searchParams.get("invoice_id");
  const orderId = searchParams.get("order_id");
  const paymentType = searchParams.get("payment_type");
  const urlStatus = searchParams.get("status");

  useEffect(
    () => () => timeoutRef.current && clearTimeout(timeoutRef.current),
    [],
  );

  const getMeta = (o, k) => o?.meta_data?.find((m) => m.key === k)?.value;

  const fetchOrder = async (id) => {
    if (!id) return null;
    try {
      const { data } = await api.get(`/orders/${id}`);
      return data;
    } catch {
      return null;
    }
  };

  const getStoredOrderId = () =>
    localStorage.getItem("last_order_id") || orderId;
  const getStoredInvoice = () =>
    localStorage.getItem("last_invoice_id") || invoiceId;

  const cleanup = () => {
    clearWalletCache();
    clearCheckoutData();
    ["last_order_id", "last_invoice_id", "last_payment_type"].forEach((k) =>
      localStorage.removeItem(k),
    );
  };

  const fetchProductImage = async (pid) => {
    if (!pid) return;
    try {
      const { data } = await api.get(`/products/${pid}`, {
        params: { _fields: "id,images" },
      });
      if (data?.images?.[0]?.src) setProductImage(data.images[0].src);
    } catch {}
  };

  const buildOrderData = (d) => {
    const items = d.line_items || [];
    const first = items[0];
    const gameFields = {};
    let playerName = null;

    first?.meta_data?.forEach((m) => {
      if (m.key.startsWith("_")) return;
      const v = safeString(m.value);
      if (!v || v.startsWith("{") || v.startsWith("[")) return;
      if (m.key === "Player Name") playerName = v;
      else gameFields[m.key] = v;
    });

    d.meta_data?.forEach((m) => {
      const k = safeString(m.key).toLowerCase();
      const v = safeString(m.value);
      if (
        !v ||
        v.startsWith("{") ||
        v.startsWith("[") ||
        m.key.startsWith("_")
      )
        return;
      if (["user", "player", "uid", "game_id", "userid"].some((s) => k.includes(s)))
        if (!gameFields["Player ID"]) gameFields["Player ID"] = v;
      if (["zone", "server", "region"].some((s) => k.includes(s)))
        if (!gameFields["Zone ID"]) gameFields["Zone ID"] = v;
      if (["ign", "username", "nickname"].some((s) => k.includes(s)))
        if (!playerName) playerName = v;
    });

    const billing = d.billing || {};
    return {
      id: d.id,
      status: d.status,
      product: {
        id: first?.product_id,
        name: first?.name?.split(" - ")[0] || first?.name,
      },
      packages: items.map((i) => ({
        name: i.name,
        quantity: i.quantity || 1,
        total: parseFloat(i.total) || 0,
      })),
      totalItems: items.length,
      gameData:
        Object.keys(gameFields).length || playerName
          ? { fields: gameFields, playerName }
          : null,
      subtotal: items.reduce((s, i) => s + (parseFloat(i.subtotal) || 0), 0),
      discount: parseFloat(d.discount_total) || 0,
      total: parseFloat(d.total) || 0,
      coupon: d.coupon_lines?.[0]
        ? {
            code: d.coupon_lines[0].code,
            discount: parseFloat(d.coupon_lines[0].discount) || 0,
          }
        : null,
      walletDeducted: parseFloat(
        getMeta(d, "_wallet_amount_deducted") ||
          getMeta(d, "_wallet_amount") ||
          0,
      ),
      billing: {
        email: billing.email,
        phone: billing.phone,
        name: `${billing.first_name || ""} ${billing.last_name || ""}`.trim(),
      },
      dateCreated: d.date_created,
    };
  };

  const buildPaymentData = (d, inv = null) => ({
    invoiceId: inv || getMeta(d, "_uddoktapay_invoice_id"),
    transactionId:
      getMeta(d, "_gateway_transaction_id") ||
      getMeta(d, "_wallet_transaction_id") ||
      `TXN${d.id}`,
    method:
      getMeta(d, "_payment_method_name") ||
      d.payment_method_title ||
      "Mobile Banking",
    senderNumber: getMeta(d, "_sender_number"),
    gatewayAmount: parseFloat(getMeta(d, "_gateway_amount_paid") || 0),
    walletAmount: parseFloat(
      getMeta(d, "_wallet_amount_deducted") ||
        getMeta(d, "_wallet_amount") ||
        0,
    ),
    total: parseFloat(d.total),
    verified: getMeta(d, "_payment_verified") === "yes",
    paidAt: d.date_created,
  });

  const handleSuccess = (d, inv) => {
    setOrder(buildOrderData(d));
    setPayment(buildPaymentData(d, inv));
    setStatus(STATUS.SUCCESS);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 4000);
    cleanup();
    if (d.line_items?.[0]?.product_id)
      fetchProductImage(d.line_items[0].product_id);
  };

  const handleOnHold = (d, r = "On Hold") => {
    setOrder(buildOrderData(d));
    setPayment(buildPaymentData(d));
    setStatus(STATUS.ON_HOLD);
    setMessage(r);
  };

  const handleFailed = (m) => {
    setStatus(STATUS.FAILED);
    setMessage(m || "Payment failed");
  };

  const evaluateOrder = async (d, inv = null) => {
    if (!d) return handleFailed("Order not found");
    const s = d.status;
    const v = getMeta(d, "_payment_verified") === "yes";
    if (["processing", "completed"].includes(s) || v)
      return handleSuccess(d, inv);
    if (s === "on-hold") return handleOnHold(d, "Verifying payment...");
    if (s === "failed") return handleFailed("Order failed");
    handleOnHold(d, s);
  };

  const verifyPayment = useCallback(
    async (inv) => {
      if (!startTime.current) startTime.current = Date.now();
      const el = Date.now() - startTime.current;
      setProgress({ retries: retries.current, elapsed: Math.round(el / 1000) });
      try {
        const res = await uddoktaPayService.verifyPayment(inv);
        if (res.status === "COMPLETED") {
          const d = await fetchOrder(res.order_id || getStoredOrderId());
          if (d) handleSuccess(d, inv);
          return;
        }
        if (["FAILED", "EXPIRED"].includes(res.status)) {
          handleFailed(
            res.status === "EXPIRED" ? "Session expired" : "Payment failed",
          );
          return;
        }
        if (el < MAX_WAIT && retries.current < MAX_RETRIES) {
          retries.current++;
          setMessage(`Verifying payment... (${Math.round(el / 1000)}s)`);
          timeoutRef.current = setTimeout(() => verifyPayment(inv), RETRY_DELAY);
          return;
        }
        const d = await fetchOrder(getStoredOrderId());
        d ? await evaluateOrder(d, inv) : handleFailed("Timeout");
      } catch {
        if (el < MAX_WAIT && retries.current < MAX_RETRIES) {
          retries.current++;
          timeoutRef.current = setTimeout(() => verifyPayment(inv), RETRY_DELAY);
          return;
        }
        const d = await fetchOrder(getStoredOrderId());
        d ? await evaluateOrder(d) : handleFailed("Verification failed");
      }
    },
    [order],
  );

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    (async () => {
      if (["failed", "expired"].includes(urlStatus)) {
        const d = await fetchOrder(getStoredOrderId());
        if (d && ["processing", "completed"].includes(d.status))
          return handleSuccess(d, invoiceId);
        return handleFailed(
          urlStatus === "expired" ? "Session expired" : "Payment failed",
        );
      }
      if (paymentType === "wallet" && orderId) {
        const d = await fetchOrder(orderId);
        return d ? evaluateOrder(d) : handleFailed("Order not found");
      }
      const inv = invoiceId || getStoredInvoice();
      if (inv) return verifyPayment(inv);
      const d = await fetchOrder(getStoredOrderId());
      return d ? evaluateOrder(d) : handleFailed("No payment session");
    })();
  }, []);

  const copy = (text, field, label = "Copied!") => {
    navigator.clipboard.writeText(String(text));
    setCopiedField(field);
    toast.success(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const fmtDate = (d) =>
    d
      ? new Date(d).toLocaleString("en-BD", {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "N/A";

  const openSupport = () => window.open(SUPPORT_LINK, "_blank");

  // ════════════════════════════════════════════════════════
  //  LOADING
  // ════════════════════════════════════════════════════════
  if (status === STATUS.LOADING) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary px-4">
        <BackgroundOrbs variant="hold" />

        <div className="relative z-10 w-full max-w-xs text-center">
          {/* Spinner stack */}
          <div className="relative mx-auto mb-10 h-28 w-28">
            {/* Outer ring */}
            <div className="absolute inset-0 rounded-full border-[2px] border-accent-orange/10" />
            <div className="absolute inset-0 animate-spin rounded-full border-[2px] border-transparent border-t-accent-orange/60"
              style={{ animationDuration: "2s" }} />

            {/* Middle ring */}
            <div className="absolute inset-4 rounded-full border-[2px] border-white/[0.04]" />
            <div className="absolute inset-4 animate-spin rounded-full border-[2px] border-transparent border-t-accent-orange/30"
              style={{ animationDirection: "reverse", animationDuration: "3s" }} />

            {/* Inner ring */}
            <div className="absolute inset-8 rounded-full border-[2px] border-white/[0.03]" />
            <div className="absolute inset-8 animate-spin rounded-full border-[2px] border-transparent border-t-accent-orange/50"
              style={{ animationDuration: "1.5s" }} />

            {/* Center */}
            <div className="absolute inset-10 flex items-center justify-center rounded-full bg-accent-orange/10">
              <Zap className="h-5 w-5 animate-pulse text-accent-orange" />
            </div>

            {/* Glow */}
            <div className="absolute inset-0 rounded-full bg-accent-orange/[0.04] blur-xl" />
          </div>

          <h2 className="mb-2 text-xl font-bold tracking-tight text-white">
            Verifying Payment
          </h2>
          <p className="mb-8 text-sm font-medium text-white/30">{message}</p>

          {progress.retries > 0 && (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="mb-2 flex justify-between text-[11px] font-medium text-white/20">
                <span>Attempt {progress.retries} of {MAX_RETRIES}</span>
                <span>{progress.elapsed}s elapsed</span>
              </div>
              <div className="relative h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-accent-orange to-amber-400 transition-all duration-700"
                  style={{ width: `${(progress.retries / MAX_RETRIES) * 100}%` }}
                />
                {/* Shimmer */}
                <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              </div>
            </div>
          )}

          <p className="mt-6 text-[11px] font-medium uppercase tracking-widest text-white/15">
            Please keep this page open
          </p>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════
  //  FAILED
  // ════════════════════════════════════════════════════════
  if (status === STATUS.FAILED) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary px-4 py-10">
        <BackgroundOrbs variant="failed" />

        <div className="relative z-10 w-full max-w-md">
          <GlassCard className="shadow-2xl shadow-black/50">
            {/* Red top bar */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/60 to-transparent" />

            {/* Header */}
            <div className="px-6 pb-8 pt-10 text-center">
              <div className="relative mx-auto mb-6 h-24 w-24">
                <div className="absolute inset-0 animate-ping rounded-full bg-red-500/10"
                  style={{ animationDuration: "2s" }} />
                <div className="absolute inset-2 animate-ping rounded-full bg-red-500/[0.06]"
                  style={{ animationDuration: "2s", animationDelay: "0.3s" }} />
                <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-red-500/20 bg-gradient-to-b from-red-500/10 to-red-600/5">
                  <XCircle className="h-10 w-10 text-red-400" />
                </div>
                <div className="absolute inset-0 rounded-full bg-red-500/[0.06] blur-xl" />
              </div>

              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-red-500/15 bg-red-500/[0.06] px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                <span className="text-[11px] font-semibold uppercase tracking-widest text-red-400">
                  Transaction Failed
                </span>
              </div>

              <h1 className="mt-3 text-2xl font-bold tracking-tight text-white">
                Payment Failed
              </h1>
              <p className="mt-1.5 text-sm text-white/30">{message}</p>
            </div>

            {/* Error details */}
            <div className="mx-5 mb-5 overflow-hidden rounded-2xl border border-red-500/10 bg-red-500/[0.03]">
              <div className="flex items-center gap-2.5 border-b border-red-500/10 px-4 py-3">
                <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                <span className="text-xs font-semibold uppercase tracking-widest text-red-400/70">
                  Error Details
                </span>
              </div>
              <div className="divide-y divide-red-500/[0.06] px-4">
                <div className="flex justify-between py-3">
                  <span className="text-[12px] font-medium uppercase tracking-widest text-white/20">
                    Status
                  </span>
                  <span className="text-[13px] font-semibold text-red-400">
                    Failed
                  </span>
                </div>
                <div className="flex justify-between py-3">
                  <span className="text-[12px] font-medium uppercase tracking-widest text-white/20">
                    Time
                  </span>
                  <span className="text-[13px] text-white/50">
                    {new Date().toLocaleString("en-BD", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Steps */}
            <div className="mx-5 mb-6 overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
              <div className="border-b border-white/[0.05] px-4 py-3">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-white/20">
                  Next Steps
                </span>
              </div>
              <div className="px-4 py-3">
                <ul className="space-y-3.5">
                  {[
                    "Check your payment method balance",
                    "Try a different payment method",
                    "Contact support if the issue persists",
                  ].map((t, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-orange/10 text-[10px] font-bold text-accent-orange ring-1 ring-accent-orange/15">
                        {i + 1}
                      </div>
                      <span className="text-[13px] text-white/45">{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 px-5 pb-6">
              <PrimaryButton onClick={() => navigate("/")} icon={Home}>
                Try Again
              </PrimaryButton>
              <div className="flex gap-2">
                <HalfButton onClick={() => navigate("/orders")} icon={ShoppingBag}>
                  Orders
                </HalfButton>
                <HalfButton onClick={openSupport} icon={MessageCircle}>
                  Support
                </HalfButton>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════
  //  ON HOLD
  // ════════════════════════════════════════════════════════
  if (status === STATUS.ON_HOLD) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary px-4 py-10">
        <BackgroundOrbs variant="hold" />

        <div className="relative z-10 w-full max-w-md">
          <GlassCard className="shadow-2xl shadow-black/50">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-orange/50 to-transparent" />

            {/* Header */}
            <div className="px-6 pb-6 pt-10 text-center">
              <div className="relative mx-auto mb-6 h-24 w-24">
                {/* Spinner */}
                <div className="absolute inset-0 rounded-full border-[2px] border-accent-orange/10" />
                <div className="absolute inset-0 animate-spin rounded-full border-[2px] border-transparent border-t-accent-orange"
                  style={{ animationDuration: "2.5s" }} />
                <div className="absolute inset-3 rounded-full border-[2px] border-amber-500/10" />
                <div className="absolute inset-3 animate-spin rounded-full border-[2px] border-transparent border-t-amber-500/40"
                  style={{ animationDirection: "reverse", animationDuration: "3.5s" }} />
                <div className="absolute inset-6 flex items-center justify-center rounded-full border border-accent-orange/15 bg-accent-orange/[0.08]">
                  <Clock className="h-6 w-6 text-accent-orange" />
                </div>
                <div className="absolute inset-0 rounded-full bg-accent-orange/[0.04] blur-xl" />
              </div>

              <h1 className="mb-2 text-2xl font-bold tracking-tight text-white">
                Payment Pending
              </h1>
              <p className="mb-4 text-sm text-white/30">
                Your payment is being verified
              </p>

              <div className="inline-flex items-center gap-2 rounded-full border border-accent-orange/20 bg-accent-orange/[0.06] px-4 py-1.5">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-orange" />
                <span className="text-[12px] font-semibold text-accent-orange">
                  {message}
                </span>
              </div>
            </div>

            {/* Order preview */}
            {order && (
              <div className="mx-5 mb-5">
                <GlassCard>
                  <div className="flex items-center gap-4 p-4">
                    {productImage ? (
                      <img
                        src={productImage}
                        alt=""
                        className="h-14 w-14 rounded-xl object-cover ring-1 ring-white/[0.08]"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/[0.04] ring-1 ring-white/[0.06]">
                        <Package className="h-5 w-5 text-white/20" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">
                        {order.product?.name}
                      </p>
                      <p className="mt-0.5 text-xs text-white/25">
                        Order #{order.id}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold text-accent-orange">
                        ৳{formatPrice(order.total)}
                      </p>
                    </div>
                  </div>
                </GlassCard>
              </div>
            )}

            {/* Progress steps */}
            <div className="mx-5 mb-6">
              <div className="space-y-1">
                {[
                  {
                    done: true,
                    label: "Payment Initiated",
                    sub: "Request received",
                    icon: Check,
                  },
                  {
                    active: true,
                    label: "Verifying Payment",
                    sub: "Confirming with gateway",
                    icon: Loader2,
                  },
                  {
                    pending: true,
                    label: "Order Processing",
                    sub: "Pending verification",
                    icon: Package,
                  },
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="relative flex flex-col items-center">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-full transition-all ${
                          step.done
                            ? "bg-accent-orange/15 ring-1 ring-accent-orange/30"
                            : step.active
                              ? "bg-accent-orange/10 ring-1 ring-accent-orange/20"
                              : "bg-white/[0.03] ring-1 ring-white/[0.06]"
                        }`}
                      >
                        {step.done ? (
                          <Check className="h-4 w-4 text-accent-orange" />
                        ) : step.active ? (
                          <Loader2 className="h-4 w-4 animate-spin text-accent-orange" />
                        ) : (
                          <step.icon className="h-4 w-4 text-white/15" />
                        )}
                      </div>
                      {i < 2 && (
                        <div
                          className={`mt-1 h-6 w-px ${step.done ? "bg-accent-orange/25" : "bg-white/[0.06]"}`}
                        />
                      )}
                    </div>
                    <div className={`pb-4 ${step.pending ? "opacity-25" : ""}`}>
                      <p className="text-sm font-semibold text-white">
                        {step.label}
                      </p>
                      <p className="text-xs text-white/30">{step.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 px-5 pb-6">
              <OutlineButton
                accent
                icon={RefreshCw}
                onClick={() => {
                  setStatus(STATUS.LOADING);
                  retries.current = 0;
                  startTime.current = null;
                  const inv = invoiceId || getStoredInvoice();
                  inv ? verifyPayment(inv) : handleFailed("Nothing to verify");
                }}
              >
                Check Status Again
              </OutlineButton>
              <div className="flex gap-2">
                <HalfButton onClick={() => navigate("/orders")}>
                  My Orders
                </HalfButton>
                <HalfButton onClick={openSupport} icon={MessageCircle}>
                  Support
                </HalfButton>
              </div>
            </div>
          </GlassCard>

          <p className="mt-4 text-center text-[11px] font-medium uppercase tracking-widest text-white/15">
            Auto-updates when payment confirms
          </p>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════
  //  SUCCESS
  // ════════════════════════════════════════════════════════
  return (
    <div className="relative min-h-screen bg-primary">
      <BackgroundOrbs variant="success" />
      {showConfetti && <Confetti />}

      <div className="relative z-10 px-4 pb-28 pt-6">
        <div className="mx-auto max-w-lg space-y-3">

          {/* ── Hero Header ── */}
          <div className="pb-2 pt-4 text-center">
            {/* Icon */}
            <div className="relative mx-auto mb-6 h-28 w-28">
              {/* Outer pulse rings */}
              <div className="absolute inset-0 animate-ping rounded-full bg-accent-orange/[0.08]"
                style={{ animationDuration: "2.5s" }} />
              <div className="absolute inset-2 animate-ping rounded-full bg-accent-orange/[0.06]"
                style={{ animationDuration: "2.5s", animationDelay: "0.4s" }} />

              {/* Ring border */}
              <div className="absolute inset-0 rounded-full border-2 border-accent-orange/20" />

              {/* Main circle */}
              <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-b from-accent-orange/15 to-orange-600/5 ring-1 ring-accent-orange/25 ring-offset-0">
                <CheckCircle2 className="h-12 w-12 text-accent-orange drop-shadow-[0_0_12px_rgba(255,100,0,0.5)]" />
              </div>

              {/* Glow */}
              <div className="absolute inset-0 rounded-full bg-accent-orange/10 blur-2xl" />

              {/* Sparkle dots */}
              {[
                { top: "0px", right: "8px" },
                { bottom: "4px", left: "4px" },
                { top: "8px", left: "0px" },
              ].map((pos, i) => (
                <Star
                  key={i}
                  className="absolute h-3 w-3 animate-pulse text-amber-400/60"
                  style={{ ...pos, animationDelay: `${i * 0.4}s` }}
                />
              ))}
            </div>

            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-accent-orange/20 bg-accent-orange/[0.06] px-4 py-1.5">
              <Sparkles className="h-3 w-3 text-accent-orange" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-accent-orange">
                Payment Successful
              </span>
            </div>

            <h1 className="mt-3 text-3xl font-black tracking-tight text-white">
              Order Confirmed!
            </h1>
            <p className="mt-2 text-sm text-white/30">
              {order?.totalItems > 1
                ? `${order.totalItems} packages have been ordered`
                : "Your order has been placed successfully"}
            </p>
          </div>

          {/* ── Order ID Banner ── */}
          {order?.id && (
            <div className="relative overflow-hidden rounded-2xl border border-accent-orange/25 bg-gradient-to-r from-accent-orange/[0.07] via-accent-orange/[0.04] to-transparent p-5">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-orange/50 to-transparent" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-orange/15 ring-1 ring-accent-orange/20">
                    <Receipt className="h-4.5 w-4.5 text-accent-orange" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-white/25">
                      Order Reference
                    </p>
                    <p className="mt-0.5 text-xl font-black text-white">
                      #{order.id}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => copy(order.id, "orderId", "Order ID copied!")}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-200 ${
                    copiedField === "orderId"
                      ? "bg-accent-orange/20 text-accent-orange"
                      : "border border-white/[0.08] bg-white/[0.04] text-white/30 hover:border-accent-orange/20 hover:bg-accent-orange/[0.06] hover:text-accent-orange"
                  }`}
                >
                  {copiedField === "orderId" ? (
                    <><Check className="h-3.5 w-3.5" /> Copied</>
                  ) : (
                    <><Copy className="h-3.5 w-3.5" /> Copy</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ── Product Card ── */}
          {order?.product && (
            <GlassCard className="p-4">
              <div className="flex items-center gap-4">
                {productImage ? (
                  <div className="relative shrink-0">
                    <img
                      src={productImage}
                      alt=""
                      className="h-16 w-16 rounded-xl object-cover ring-1 ring-white/[0.08]"
                    />
                    <div className="absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-accent-orange/30 bg-accent-orange/20">
                      <Check className="h-3 w-3 text-accent-orange" />
                    </div>
                  </div>
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] ring-1 ring-white/[0.06]">
                    <Gamepad2 className="h-7 w-7 text-white/15" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-white">
                    {order.product.name}
                  </p>
                  <p className="mt-1 text-xs text-white/30">
                    {order.packages?.length} package
                    {order.packages?.length > 1 ? "s" : ""} ordered
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <div className="flex items-center gap-1.5 rounded-full border border-accent-orange/20 bg-accent-orange/[0.06] px-2.5 py-1">
                    <BadgeCheck className="h-3.5 w-3.5 text-accent-orange" />
                    <span className="text-[11px] font-bold text-accent-orange">
                      Verified
                    </span>
                  </div>
                </div>
              </div>
            </GlassCard>
          )}

          {/* ── Game Data ── */}
          {order?.gameData &&
            Object.keys(order.gameData.fields || {}).length > 0 && (
              <SectionCard icon={Gamepad2} title="Game Account" accent>
                <div className="divide-y divide-accent-orange/[0.07]">
                  {Object.entries(order.gameData.fields || {}).map(([k, v]) => (
                    <InfoRow
                      key={k}
                      label={k}
                      value={v}
                      fieldId={`game-${k}`}
                      mono
                      copiedField={copiedField}
                      onCopy={copy}
                    />
                  ))}
                  {order.gameData.playerName && (
                    <div className="flex items-center justify-between py-3">
                      <span className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-widest text-white/25">
                        <User className="h-3 w-3" />
                        In-Game Name
                      </span>
                      <span className="text-[13px] font-bold text-accent-orange">
                        {order.gameData.playerName}
                      </span>
                    </div>
                  )}
                </div>
              </SectionCard>
            )}

          {/* ── Contact ── */}
          {order?.billing && (order.billing.email || order.billing.phone) && (
            <SectionCard icon={User} title="Contact Info">
              <div className="divide-y divide-white/[0.04]">
                {order.billing.email && (
                  <InfoRow
                    label="Email"
                    value={order.billing.email}
                    fieldId="email"
                    icon={Mail}
                    copiedField={copiedField}
                    onCopy={copy}
                  />
                )}
                {order.billing.phone && (
                  <InfoRow
                    label="Phone"
                    value={order.billing.phone}
                    fieldId="phone"
                    icon={Phone}
                    copiedField={copiedField}
                    onCopy={copy}
                  />
                )}
                {order.billing.name && (
                  <InfoRow
                    label="Name"
                    value={order.billing.name}
                    fieldId="name"
                    icon={User}
                    copiedField={copiedField}
                    onCopy={copy}
                  />
                )}
              </div>
            </SectionCard>
          )}

          {/* ── Payment ── */}
          {payment && (
            <SectionCard
              icon={CreditCard}
              title="Payment Details"
              badge={
                <div className="flex items-center gap-1.5 rounded-full border border-accent-orange/15 bg-accent-orange/[0.06] px-2.5 py-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-accent-orange" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-accent-orange">
                    Verified
                  </span>
                </div>
              }
            >
              <div className="divide-y divide-white/[0.04]">
                <InfoRow
                  label="Transaction ID"
                  value={payment.transactionId}
                  fieldId="txn"
                  mono
                  copiedField={copiedField}
                  onCopy={copy}
                />
                {payment.invoiceId && (
                  <InfoRow
                    label="Invoice ID"
                    value={payment.invoiceId}
                    fieldId="inv"
                    mono
                    copiedField={copiedField}
                    onCopy={copy}
                  />
                )}
                <StaticRow label="Method" value={payment.method} />
                {payment.senderNumber && (
                  <InfoRow
                    label="Sender"
                    value={payment.senderNumber}
                    fieldId="sender"
                    copiedField={copiedField}
                    onCopy={copy}
                  />
                )}
                <StaticRow label="Date" value={fmtDate(payment.paidAt)} />
              </div>
            </SectionCard>
          )}

          {/* ── Packages ── */}
          {order?.packages?.length > 0 && (
            <SectionCard
              icon={Package}
              title={`Packages (${order.packages.length})`}
            >
              <div className="divide-y divide-white/[0.04]">
                {order.packages.map((p, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-orange/[0.08] text-[11px] font-black text-accent-orange ring-1 ring-accent-orange/15">
                        {p.quantity}×
                      </div>
                      <span className="text-[13px] text-white/70">{p.name}</span>
                    </div>
                    <span className="text-[13px] font-semibold text-white/75">
                      ৳{formatPrice(p.total)}
                    </span>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* ── Summary ── */}
          <GlassCard accent glow className="overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-orange/60 to-transparent" />

            <div className="flex items-center gap-3 border-b border-accent-orange/10 px-5 py-3.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-orange/15 ring-1 ring-accent-orange/20">
                <Receipt className="h-4 w-4 text-accent-orange" />
              </div>
              <span className="text-sm font-bold tracking-tight text-white">
                Order Summary
              </span>
            </div>

            <div className="px-5 py-4">
              <div className="space-y-0 divide-y divide-accent-orange/[0.07]">
                <div className="flex justify-between py-3">
                  <span className="text-[12px] font-medium uppercase tracking-widest text-white/25">
                    Subtotal
                  </span>
                  <span className="text-[13px] text-white/60">
                    ৳{formatPrice(order?.subtotal)}
                  </span>
                </div>

                {order?.discount > 0 && (
                  <div className="flex items-center justify-between py-3">
                    <span className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-widest text-white/25">
                      Discount
                      {order.coupon && (
                        <span className="rounded-md bg-accent-orange/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-accent-orange ring-1 ring-accent-orange/15">
                          {order.coupon.code}
                        </span>
                      )}
                    </span>
                    <span className="text-[13px] font-semibold text-accent-orange">
                      −৳{formatPrice(order.discount)}
                    </span>
                  </div>
                )}

                {order?.walletDeducted > 0 && (
                  <div className="flex items-center justify-between py-3">
                    <span className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-widest text-white/25">
                      <Wallet className="h-3 w-3" />
                      G Coin
                    </span>
                    <span className="text-[13px] font-semibold text-accent-orange">
                      −৳{formatPrice(order.walletDeducted)}
                    </span>
                  </div>
                )}
              </div>

              {/* Total */}
              <div className="mt-2 overflow-hidden rounded-xl bg-accent-orange/[0.06] p-4 ring-1 ring-accent-orange/15">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-accent-orange/60">
                      Total Paid
                    </p>
                    <p className="mt-0.5 text-[10px] text-white/20">
                      All taxes included
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-black tracking-tight text-accent-orange">
                      ৳{formatPrice(order?.total)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* ── Actions ── */}
          <div className="space-y-2.5 pt-2">
            <PrimaryButton
              onClick={() => {
                cleanup();
                navigate("/");
              }}
              icon={Home}
            >
              Continue Shopping
            </PrimaryButton>
            <OutlineButton
              onClick={() => navigate("/orders")}
              icon={ShoppingBag}
            >
              View All Orders
              <ArrowRight className="ml-auto h-4 w-4" />
            </OutlineButton>
          </div>

          {/* ── Support ── */}
          <GlassCard className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] ring-1 ring-white/[0.06]">
                  <HeadphonesIcon className="h-4 w-4 text-white/30" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white/50">
                    Need help?
                  </p>
                  <p className="text-xs text-white/20">
                    We're here 24/7
                  </p>
                </div>
              </div>
              <button
                onClick={openSupport}
                className="flex items-center gap-1.5 rounded-xl border border-accent-orange/20 bg-accent-orange/[0.06] px-3.5 py-2 text-[13px] font-semibold text-accent-orange transition hover:bg-accent-orange/10"
              >
                Contact Us
                <ExternalLink className="h-3 w-3" />
              </button>
            </div>
          </GlassCard>

        </div>
      </div>
    </div>
  );
};

export default OrderSummary;