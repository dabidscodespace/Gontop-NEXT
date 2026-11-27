// src/pages/WalletCancelled.jsx
import { Home, MessageCircle, RefreshCw, Wallet, XCircle } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

const SUPPORT_MESSENGER = "https://www.facebook.com/gontopofficial";
const WalletCancelled = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const reason = searchParams.get("reason");
  const error = searchParams.get("error");

  const handleRetry = () => navigate("/profile");
  const handleGoHome = () => navigate("/");

  const handleContactSupport = () => {
    const msg = encodeURIComponent(
      `Hi, I need help with my wallet top-up. Reason: ${
        reason || error || "User cancelled or unknown issue"
      }`,
    );
    window.open(`${SUPPORT_MESSENGER}&ref=wallet_issue&text=${msg}`, "_blank");
  };

  const getMessage = () => {
    if (error === "no_invoice") return "No payment information found.";
    if (reason) return reason;
    return "You cancelled the top-up. No amount has been charged.";
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary px-4 py-8">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-secondary/40 p-8 text-center shadow-2xl shadow-black/50 backdrop-blur-sm">
          {/* Top edge glow */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-orange/30 to-transparent" />

          {/* Radial glow behind icon */}
          <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 rounded-full bg-accent-orange/5 blur-3xl" />

          {/* Icon */}
          <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/5">
            <XCircle className="h-10 w-10 text-white/40" />
          </div>

          {/* Title */}
          <h1 className="mb-2 text-2xl font-bold text-white">
            Top-up Cancelled
          </h1>

          {/* Message */}
          <p className="mb-6 text-sm text-white/40">{getMessage()}</p>

          {/* Info Banner */}
          <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-accent-orange/15 bg-accent-orange/8 p-3.5 text-left">
            <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent-orange/20">
              <span className="text-[10px] font-bold text-accent-orange">
                i
              </span>
            </div>
            <p className="text-sm text-accent-orange/70">
              No amount was charged for this cancelled wallet top-up.
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-2.5">
            {/* Try Again — Primary */}
            <button
              onClick={handleRetry}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-accent-orange py-3 text-sm font-semibold text-white shadow-lg shadow-accent-orange/20 transition hover:opacity-90 active:scale-[0.98]"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>

            {/* Home + Wallet row */}
            <div className="flex gap-2.5">
              <button
                onClick={handleGoHome}
                className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/10 py-3 text-sm font-medium text-white/50 transition hover:border-accent-orange/20 hover:bg-accent-orange/5 hover:text-white"
              >
                <Home className="h-4 w-4" />
                Home
              </button>
              <button
                onClick={() => navigate("/profile")}
                className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/10 py-3 text-sm font-medium text-white/50 transition hover:border-accent-orange/20 hover:bg-accent-orange/5 hover:text-white"
              >
                <Wallet className="h-4 w-4" />
                Wallet
              </button>
            </div>

            {/* Contact Support */}
            <button
              onClick={handleContactSupport}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-accent-orange/30 py-3 text-sm font-medium text-accent-orange transition hover:bg-accent-orange/10 active:scale-[0.98]"
            >
              <MessageCircle className="h-4 w-4" />
              Contact Support on Messenger
            </button>
          </div>
        </div>

        {/* Bottom Note */}
        <p className="mt-4 text-center text-xs text-white/25">
          Need help?{" "}
          <button
            onClick={handleContactSupport}
            className="font-medium text-accent-orange hover:underline"
          >
            Contact our support team
          </button>
        </p>
      </div>
    </div>
  );
};

export default WalletCancelled;
