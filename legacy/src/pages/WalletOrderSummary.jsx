// src/pages/WalletOrderSummary.jsx
import {
  AlertCircle,
  CheckCircle,
  Copy,
  CreditCard,
  Home,
  Loader2,
  PauseCircle,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { clearWalletCache } from "../api/services/wallet";
import uddoktaPayService from "../services/uddoktaPayService";

const MAX_RETRIES = 5;
const RETRY_DELAY = 3000;

const WalletOrderSummary = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initRef = useRef(false);
  const retryCountRef = useRef(0);

  const [status, setStatus] = useState("verifying");
  const [details, setDetails] = useState(null);
  const [processingStep, setProcessingStep] = useState("Verifying top-up...");

  const invoiceId = searchParams.get("invoice_id");

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    if (!invoiceId) {
      navigate("/wallet/cancel?error=missing_invoice");
      return;
    }
    verifyTopup();
  }, []);

  const verifyTopup = async () => {
    try {
      const result = await uddoktaPayService.verifyWalletPayment(invoiceId);

      switch (result.status) {
        case "COMPLETED":
          setStatus("success");
          setDetails({
            amount: result.amount,
            balance: result.balance,
            transactionId: result.transaction_id,
            alreadyCredited: result.already_credited,
          });
          clearWalletCache();
          if (!result.already_credited) {
            toast.success(`৳${result.amount} added to wallet!`);
          }
          break;

        case "PENDING":
        case "WAITING":
          if (retryCountRef.current < MAX_RETRIES) {
            retryCountRef.current += 1;
            setProcessingStep(
              `Processing... (${retryCountRef.current}/${MAX_RETRIES})`,
            );
            setTimeout(verifyTopup, RETRY_DELAY);
          } else {
            setStatus("on_hold");
            setDetails({
              message: "Top-up is still processing. Please wait.",
              amount: result.amount,
              transactionId: result.transaction_id,
            });
          }
          break;

        case "ON_HOLD":
        case "ONHOLD":
        case "HOLD":
          setStatus("on_hold");
          setDetails({
            message:
              result.message || "Your top-up is on hold and under review",
            transactionId: result.transaction_id,
            amount: result.amount,
          });
          break;

        case "CANCELLED":
        case "FAILED":
        case "EXPIRED":
        default:
          navigate(
            `/wallet/cancel?error=${result.status?.toLowerCase() || "unknown"}`,
          );
          break;
      }
    } catch (err) {
      navigate(`/wallet/cancel?error=${encodeURIComponent(err.message)}`);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(String(text));
    toast.success("Copied!");
  };

  // ── VERIFYING ─────────────────────────────────────────
  if (status === "verifying") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-primary px-4">
        {/* Spinner */}
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 rounded-full border-4 border-accent-orange/10" />
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-accent-orange" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-accent-orange" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-base font-medium text-white">{processingStep}</p>
          <p className="mt-1 text-sm text-white/30">
            Please don't close this page
          </p>
        </div>
      </div>
    );
  }

  // ── SUCCESS / ON_HOLD ─────────────────────────────────
  return (
    <div className="flex min-h-screen items-center justify-center bg-primary px-4 py-8">
      <div className="w-full max-w-md">

        {/* Card */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-secondary/40 p-8 shadow-2xl shadow-black/50 backdrop-blur-sm">

          {/* Top edge glow */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-orange/30 to-transparent" />

          {/* Radial glow */}
          <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 rounded-full bg-accent-orange/5 blur-3xl" />

          {/* ── SUCCESS HEADER ── */}
          {status === "success" && (
            <div className="mb-6 text-center">
              <div className="relative mx-auto mb-5 h-20 w-20">
                <div className="absolute inset-0 animate-ping rounded-full bg-accent-orange/15" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-accent-orange/30 bg-accent-orange/10">
                  <CheckCircle className="h-10 w-10 text-accent-orange" />
                </div>
              </div>
              <h1 className="mb-1 text-2xl font-bold text-white">
                Top-up Successful!
              </h1>
              <p className="text-sm text-white/40">
                Your wallet has been credited
              </p>
            </div>
          )}

          {/* ── ON HOLD HEADER ── */}
          {status === "on_hold" && (
            <div className="mb-6 text-center">
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-accent-orange/20 bg-accent-orange/10">
                <PauseCircle className="h-10 w-10 text-accent-orange" />
              </div>
              <h1 className="mb-1 text-2xl font-bold text-white">
                Top-up On Hold
              </h1>
              <p className="text-sm text-white/40">
                Your payment is under review
              </p>
            </div>
          )}

          {/* ── SUCCESS DETAILS ── */}
          {status === "success" && details && (
            <div className="mb-6 space-y-3">

              {/* Amount Added */}
              <div className="rounded-xl border border-accent-orange/20 bg-accent-orange/8 p-5 text-center">
                <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-accent-orange/60">
                  Amount Added
                </p>
                <p className="text-4xl font-bold text-accent-orange">
                  ৳{details.amount?.toFixed(2)}
                </p>
                {details.alreadyCredited && (
                  <p className="mt-2 text-xs text-white/30">
                    Already credited to your wallet
                  </p>
                )}
              </div>

              {/* New Balance */}
              <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/5 px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-orange/15">
                    <Wallet className="h-4 w-4 text-accent-orange" />
                  </div>
                  <span className="text-sm text-white/50">New Balance</span>
                </div>
                <span className="text-lg font-bold text-white">
                  ৳{details.balance?.toFixed(2)}
                </span>
              </div>

              {/* Transaction ID */}
              {details.transactionId && (
                <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/5 px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-orange/15">
                      <CreditCard className="h-4 w-4 text-accent-orange" />
                    </div>
                    <span className="text-sm text-white/50">Transaction ID</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="max-w-[110px] truncate rounded-lg border border-white/10 bg-white/5 px-2 py-1 font-mono text-xs text-white">
                      {details.transactionId}
                    </code>
                    <button
                      onClick={() => copyToClipboard(details.transactionId)}
                      className="rounded-lg p-1.5 text-white/30 transition hover:bg-accent-orange/10 hover:text-accent-orange"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── ON HOLD DETAILS ── */}
          {status === "on_hold" && details && (
            <div className="mb-6 space-y-3">

              {/* Amount */}
              {details.amount && (
                <div className="rounded-xl border border-accent-orange/20 bg-accent-orange/8 p-5 text-center">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-accent-orange/60">
                    Amount
                  </p>
                  <p className="text-4xl font-bold text-accent-orange">
                    ৳{details.amount?.toFixed(2)}
                  </p>
                </div>
              )}

              {/* Transaction ID */}
              {details.transactionId && (
                <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/5 px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-orange/15">
                      <CreditCard className="h-4 w-4 text-accent-orange" />
                    </div>
                    <span className="text-sm text-white/50">Transaction ID</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="max-w-[110px] truncate rounded-lg border border-white/10 bg-white/5 px-2 py-1 font-mono text-xs text-white">
                      {details.transactionId}
                    </code>
                    <button
                      onClick={() => copyToClipboard(details.transactionId)}
                      className="rounded-lg p-1.5 text-white/30 transition hover:bg-accent-orange/10 hover:text-accent-orange"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* On Hold Info */}
              <div className="flex items-start gap-3 rounded-xl border border-accent-orange/15 bg-accent-orange/8 p-4">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent-orange" />
                <div className="text-sm">
                  <p className="font-semibold text-accent-orange">
                    Payment Under Review
                  </p>
                  <p className="mt-1 text-white/40">
                    {details.message ||
                      "Your payment is being reviewed by our team."}
                  </p>
                  <ul className="mt-3 space-y-1 text-white/30">
                    <li>• Your wallet will be credited once approved</li>
                    <li>• You'll receive a notification when resolved</li>
                    <li>• Contact support if it takes longer than 24 hours</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* ── ACTIONS ── */}
          <div className="space-y-2.5">
            {status === "success" && (
              <>
                <button
                  onClick={() => navigate("/profile")}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-orange py-3 text-sm font-semibold text-white shadow-lg shadow-accent-orange/20 transition hover:opacity-90 active:scale-[0.98]"
                >
                  <Wallet className="h-4 w-4" />
                  Go to Wallet
                </button>
                <button
                  onClick={() => navigate("/")}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-3 text-sm font-medium text-white/50 transition hover:border-accent-orange/20 hover:bg-accent-orange/5 hover:text-white"
                >
                  <Home className="h-4 w-4" />
                  Continue Shopping
                </button>
              </>
            )}

            {status === "on_hold" && (
              <>
                <button
                  onClick={() => {
                    retryCountRef.current = 0;
                    setStatus("verifying");
                    verifyTopup();
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-accent-orange/30 py-3 text-sm font-medium text-accent-orange transition hover:bg-accent-orange/10 active:scale-[0.98]"
                >
                  <RefreshCw className="h-4 w-4" />
                  Check Status
                </button>
                <button
                  onClick={() => navigate("/profile")}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-orange py-3 text-sm font-semibold text-white shadow-lg shadow-accent-orange/20 transition hover:opacity-90 active:scale-[0.98]"
                >
                  <Wallet className="h-4 w-4" />
                  Go to Wallet
                </button>
                <button
                  onClick={() => navigate("/")}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-3 text-sm font-medium text-white/50 transition hover:border-accent-orange/20 hover:bg-accent-orange/5 hover:text-white"
                >
                  <Home className="h-4 w-4" />
                  Go Home
                </button>
              </>
            )}
          </div>
        </div>

        {/* Bottom Note */}
        <p className="mt-4 text-center text-xs text-white/25">
          Need help?{" "}
          <a
            href="https://wa.me/8801XXXXXXXXX"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-accent-orange hover:underline"
          >
            Contact Support
          </a>
        </p>
      </div>
    </div>
  );
};

export default WalletOrderSummary;