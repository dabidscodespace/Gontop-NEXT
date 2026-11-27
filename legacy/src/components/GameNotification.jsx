// src/components/GameNotification.jsx
import { useEffect, useMemo, useState } from "react";

const formatMessage = (text = "") => {
  return String(text)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\s*•\s*/g, "\n• ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

const GameNotification = ({ notification, productId }) => {
  const [show, setShow] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!notification?.enabled || !productId) return;
    if (!notification?.title || !notification?.message) return;

    if (notification.show_until) {
      const expiry = new Date(notification.show_until + "T23:59:59");
      if (new Date() > expiry) return;
    }

    setShow(true);
    document.body.style.overflow = "hidden";
    const timer = setTimeout(() => setVisible(true), 50);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = "";
    };
  }, [notification, productId]);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(() => {
      document.body.style.overflow = "";
      setShow(false);
    }, 500);
  };

  const { title, message, dismissible = true } = notification || {};
  const formattedMessage = useMemo(() => formatMessage(message), [message]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 transition-all duration-700 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={dismissible ? handleDismiss : undefined}
        style={{
          background:
            "radial-gradient(circle at center, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.5) 100%)",
          backdropFilter: "blur(12px)",
        }}
      />

      {/* Floating particles */}
      <div
        className={`pointer-events-none absolute inset-0 overflow-hidden transition-opacity duration-1000 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      >
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${4 + (i % 3) * 2}px`,
              height: `${4 + (i % 3) * 2}px`,
              left: `${5 + i * 9}%`,
              background: i % 2 === 0 ? "var(--color-primary)" : "#a78bfa",
              opacity: 0.25,
              animation: `gn-float ${5 + (i % 3) * 2}s ease-in-out infinite`,
              animationDelay: `${i * 0.4}s`,
            }}
          />
        ))}
      </div>

      {/* Modal */}
      <div
        className={`relative w-full max-w-md transition-all duration-600 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          visible
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-16 scale-85 opacity-0"
        }`}
      >
        {/* Soft glow behind card */}
        <div
          className="absolute -inset-4 rounded-[28px] opacity-30 blur-3xl"
          style={{
            background:
              "linear-gradient(135deg, var(--color-primary) 0%, #a78bfa 50%, var(--color-primary) 100%)",
            animation: "gn-glow-pulse 3s ease-in-out infinite",
          }}
        />

        {/* Close button */}
        {dismissible && (
          <button
            onClick={handleDismiss}
            className="absolute -top-2.5 -right-2.5 z-20 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-gray-200 transition-all duration-300 hover:scale-110 hover:bg-red-50 hover:ring-red-200 active:scale-90"
          >
            <svg
              className="h-3.5 w-3.5 text-gray-400 transition-colors hover:text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}

        <div className="relative overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-gray-100">
          {/* Animated rainbow top border */}
          <div className="relative h-1 w-full overflow-hidden">
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(90deg, var(--color-primary), #8b5cf6, #ec4899, #f59e0b, var(--color-primary))",
                backgroundSize: "200% 100%",
                animation: "gn-shimmer 3s linear infinite",
              }}
            />
          </div>

          {/* Header */}
          <div className="relative px-6 pt-6 pb-4">
            {/* Soft gradient background */}
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 2px 2px, var(--color-primary) 1px, transparent 0)",
                backgroundSize: "20px 20px",
              }}
            />

            <div className="relative flex items-start gap-4">
              {/* Icon */}
              <div className="relative shrink-0">
                <div
                  className="absolute -inset-1.5 rounded-2xl opacity-30 blur-lg"
                  style={{
                    background: "var(--color-primary)",
                    animation: "gn-glow-pulse 2.5s ease-in-out infinite",
                  }}
                />
                <div className="from-primary to-primary-hover relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br shadow-md">
                  <svg
                    className="h-6 w-6 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    style={{ animation: "gn-ring 3s ease-in-out infinite" }}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                    />
                  </svg>
                </div>
              </div>

              {/* Title area */}
              <div className="min-w-0 flex-1 pt-0.5">
                <h3 className="text-base font-bold text-gray-900">{title}</h3>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
                  </span>
                  <span className="text-xs font-medium text-amber-600/70">
                    Important Notice
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="mx-6">
            <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
          </div>

          {/* Content */}
          <div className="px-6 py-5">
            <div className="max-h-56 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-200">
              <p className="text-left text-sm leading-7 break-words whitespace-pre-line text-gray-600">
                {formattedMessage}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 pb-5">
            <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3">
              <div className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 text-gray-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
                  />
                </svg>
                <span className="text-xs text-gray-400">
                  Read before proceeding
                </span>
              </div>

              {dismissible && (
                <button
                  onClick={handleDismiss}
                  className="hover:border-primary/30 hover:text-primary cursor-pointer rounded-lg border border-gray-200 bg-white px-4 py-1.5 text-xs font-semibold text-gray-500 shadow-sm transition-all duration-200 hover:shadow-md active:scale-95"
                >
                  Dismiss
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes gn-float {
          0%, 100% {
            transform: translateY(100vh) scale(0);
            opacity: 0;
          }
          10% {
            opacity: 0.25;
            transform: translateY(85vh) scale(1);
          }
          85% {
            opacity: 0.25;
          }
          100% {
            transform: translateY(-10vh) scale(0.5);
            opacity: 0;
          }
        }
        @keyframes gn-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes gn-glow-pulse {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.05); }
        }
        @keyframes gn-ring {
          0%, 100% { transform: rotate(0deg); }
          5% { transform: rotate(14deg); }
          10% { transform: rotate(-8deg); }
          15% { transform: rotate(6deg); }
          20% { transform: rotate(-4deg); }
          25% { transform: rotate(2deg); }
          30%, 100% { transform: rotate(0deg); }
        }
      `}</style>
    </div>
  );
};

export default GameNotification;
