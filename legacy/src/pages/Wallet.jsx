import React, { useState, useEffect } from "react";
import {
  Wallet as WalletIcon,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  X,
  ShoppingBag,
} from "lucide-react";
import { toast } from "react-toastify";
import { getWalletData, isWalletDisabled } from "../api/services/wallet";
import { Storage } from "../api/utils/storage";
import { CONFIG } from "../api/config";
import uddoktaPayService from "../services/uddoktaPayService";
import bkashLogo from "../assets/Bkash.png";
import nagadLogo from "../assets/Nagad.png";
import rocketLogo from "../assets/rocket.png";

const Wallet = () => {
  const [walletData, setWalletData] = useState({
    balance: 0,
    currency: CONFIG.DEFAULT_CURRENCY,
    transactions: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("");
  const [topUpLoading, setTopUpLoading] = useState(false);
  const customer = Storage.getCustomer();

  if (isWalletDisabled()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <WalletIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Wallet Temporarily Unavailable
          </h2>
          <p className="text-gray-600">
            The wallet feature is currently disabled. Please check back later.
          </p>
        </div>
      </div>
    );
  }

  const fetchWalletData = async (force = false) => {
    try {
      if (force) setRefreshing(true);
      else setLoading(true);
      const data = await getWalletData(customer.email, force);
      setWalletData(data);
    } catch (error) {
      console.error("Failed to fetch wallet data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (customer.email) fetchWalletData();
  }, [customer.email]);

  // ── DEBUG: remove after checking ──────────────────────────────────────────
  useEffect(() => {
    if (walletData.transactions.length > 0) {
      console.log(
        "[RAW TRANSACTIONS]:",
        JSON.stringify(walletData.transactions, null, 2)
      );
    }
  }, [walletData.transactions]);

  const quickAmounts = [100, 500, 1000, 2000, 5000];

  const paymentMethods = [
    { id: "bkash",  name: "bKash",  image: bkashLogo },
    { id: "nagad",  name: "Nagad",  image: nagadLogo },
    { id: "rocket", name: "Rocket", image: rocketLogo },
  ];

  const handleTopUp = async () => {
    if (!topUpAmount || parseFloat(topUpAmount) < 10) {
      toast.error("Minimum top-up amount is ৳10");
      return;
    }
    if (!selectedMethod) {
      toast.error("Please select a payment method");
      return;
    }

    setTopUpLoading(true);
    try {
      const methodName =
        paymentMethods.find((m) => m.id === selectedMethod)?.name ||
        selectedMethod;
      const res = await uddoktaPayService.initWalletTopup(
        parseFloat(topUpAmount),
        methodName
      );
      if (res.success && res.payment_url) {
        toast.success("Redirecting to payment...");
        window.location.href = res.payment_url;
      } else {
        throw new Error(res.message || "Payment initialization failed");
      }
    } catch (e) {
      toast.error(e.message || "Payment failed. Please try again.");
    } finally {
      setTopUpLoading(false);
    }
  };

  const handleCloseModal = () => {
    if (topUpLoading) return;
    setShowTopUpModal(false);
    setTopUpAmount("");
    setSelectedMethod("");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            My Wallet
          </h1>
          <button
            onClick={() => fetchWalletData(true)}
            disabled={refreshing}
            className="p-2 rounded-full hover:bg-gray-200 transition-colors"
          >
            <RefreshCw
              className={`w-5 h-5 text-gray-600 ${refreshing ? "animate-spin" : ""}`}
            />
          </button>
        </div>

        {/* Balance Card */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl p-6 md:p-8 text-white shadow-xl mb-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <WalletIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm opacity-90">Available Balance</p>
              <p className="text-3xl md:text-4xl font-bold">
                ৳{walletData.balance.toFixed(2)}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowTopUpModal(true)}
            className="w-full md:w-auto bg-white text-orange-600 font-semibold py-3 px-6 
                       rounded-full hover:bg-gray-100 transition-colors flex items-center 
                       justify-center gap-2 shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Top Up Wallet
          </button>
        </div>

        {/* Transactions */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Transaction History
          </h2>

          {walletData.transactions.length === 0 ? (
            <div className="text-center py-12">
              <WalletIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {walletData.transactions.map((transaction) => (
                <TransactionItem
                  key={transaction.id}
                  transaction={transaction}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <TopUpModal
        isOpen={showTopUpModal}
        topUpAmount={topUpAmount}
        setTopUpAmount={setTopUpAmount}
        selectedMethod={selectedMethod}
        setSelectedMethod={setSelectedMethod}
        quickAmounts={quickAmounts}
        paymentMethods={paymentMethods}
        onClose={handleCloseModal}
        onSubmit={handleTopUp}
        loading={topUpLoading}
      />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  Transaction Item
// ─────────────────────────────────────────────────────────────────────────────
const TransactionItem = ({ transaction }) => {
  const isCredit = transaction.type === "credit";
  const amount = parseFloat(transaction.amount || 0);

  // ── Detect source / purpose ───────────────────────────────────────────────
  const getInfo = () => {
    const desc = (
      transaction.description ||
      transaction.note ||
      transaction.details ||
      ""
    ).toLowerCase();

    const method = (
      transaction.payment_method ||
      transaction.gateway ||
      transaction.via ||
      ""
    ).toLowerCase();

    // ── CREDIT: how money was added ─────────────────────────────────────────
    if (isCredit) {
      if (desc.includes("bkash") || method.includes("bkash")) {
        return {
          title: "bKash Top-up",
          subtitle: "Added via bKash",
          image: bkashLogo,
          bg: "bg-pink-50",
          iconBg: "bg-pink-100",
          amountColor: "text-green-600",
        };
      }
      if (desc.includes("nagad") || method.includes("nagad")) {
        return {
          title: "Nagad Top-up",
          subtitle: "Added via Nagad",
          image: nagadLogo,
          bg: "bg-orange-50",
          iconBg: "bg-orange-100",
          amountColor: "text-green-600",
        };
      }
      if (desc.includes("rocket") || method.includes("rocket")) {
        return {
          title: "Rocket Top-up",
          subtitle: "Added via Rocket",
          image: rocketLogo,
          bg: "bg-purple-50",
          iconBg: "bg-purple-100",
          amountColor: "text-green-600",
        };
      }
      if (desc.includes("refund")) {
        return {
          title: "Order Refund",
          subtitle: "Refunded to wallet",
          emoji: "↩️",
          bg: "bg-blue-50",
          iconBg: "bg-blue-100",
          amountColor: "text-green-600",
        };
      }
      if (desc.includes("cashback") || desc.includes("bonus") || desc.includes("reward")) {
        return {
          title: "Bonus / Cashback",
          subtitle: "Reward credited",
          emoji: "🎁",
          bg: "bg-yellow-50",
          iconBg: "bg-yellow-100",
          amountColor: "text-green-600",
        };
      }
      if (desc.includes("admin") || desc.includes("manual")) {
        return {
          title: "Admin Credit",
          subtitle: "Added by admin",
          emoji: "🛡️",
          bg: "bg-gray-50",
          iconBg: "bg-gray-100",
          amountColor: "text-green-600",
        };
      }
      // Generic top-up
      return {
        title: "Wallet Top-up",
        subtitle: "Balance added",
        emoji: "💰",
        bg: "bg-green-50",
        iconBg: "bg-green-100",
        amountColor: "text-green-600",
      };
    }

    // ── DEBIT: how money was spent ──────────────────────────────────────────
    if (
      desc.includes("order") ||
      desc.includes("purchase") ||
      desc.includes("payment for") ||
      transaction.order_id
    ) {
      return {
        title: "Order Payment",
        subtitle: "Paid via G Coin",
        emoji: "🛒",
        bg: "bg-red-50",
        iconBg: "bg-red-100",
        amountColor: "text-red-600",
      };
    }
    if (desc.includes("withdrawal") || desc.includes("withdraw")) {
      return {
        title: "Withdrawal",
        subtitle: "Funds withdrawn",
        emoji: "🏧",
        bg: "bg-gray-50",
        iconBg: "bg-gray-100",
        amountColor: "text-red-600",
      };
    }
    // Generic debit
    return {
      title: "Payment",
      subtitle: "Amount deducted",
      emoji: "📤",
      bg: "bg-red-50",
      iconBg: "bg-red-100",
      amountColor: "text-red-600",
    };
  };

  // ── Extract order ID ──────────────────────────────────────────────────────
  const getOrderId = () => {
    const desc = transaction.description || transaction.details || "";
    const patterns = [
      /order\s*#?\s*(\d+)/i,
      /#(\d+)/,
      /order_id[:\s]+(\d+)/i,
      /wc[-_]?order[-_\s]*(\d+)/i,
      /purchase\s*#?\s*(\d+)/i,
      /invoice\s*#?\s*(\d+)/i,
    ];
    for (const p of patterns) {
      const m = desc.match(p);
      if (m) return m[1];
    }
    if (transaction.order_id) return String(transaction.order_id);
    return null;
  };

  const info = getInfo();
  const orderId = !isCredit ? getOrderId() : null; // only show order ID for debits

  const getStatusBadge = () => {
    switch (transaction.status) {
      case "completed":
        return (
          <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
            <CheckCircle className="w-3 h-3" /> Completed
          </span>
        );
      case "pending":
        return (
          <span className="flex items-center gap-1 text-xs text-yellow-600 font-medium">
            <Clock className="w-3 h-3" /> Pending
          </span>
        );
      case "failed":
        return (
          <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
            <XCircle className="w-3 h-3" /> Failed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={`flex items-center gap-3 p-4 rounded-xl transition-colors hover:brightness-95 ${info.bg}`}
    >
      {/* Icon */}
      <div
        className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${info.iconBg}`}
      >
        {info.image ? (
          <img
            src={info.image}
            alt={info.title}
            className="w-7 h-7 object-contain"
          />
        ) : (
          <span className="text-xl">{info.emoji}</span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        {/* Title + Order ID */}
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-gray-900 text-sm">{info.title}</p>
          {orderId && (
            <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">
              #{orderId}
            </span>
          )}
        </div>

        {/* Subtitle */}
        <p className="text-xs text-gray-500 mt-0.5">{info.subtitle}</p>

        {/* Date + Status */}
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-gray-400">
            {new Date(transaction.date).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
          {getStatusBadge()}
        </div>
      </div>

      {/* Amount */}
      <div className="text-right shrink-0">
        <p className={`font-bold text-base ${info.amountColor}`}>
          {isCredit ? "+" : "-"}৳{amount.toFixed(2)}
        </p>
        <p className="text-xs text-gray-400">{isCredit ? "Credit" : "Debit"}</p>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  Top-up Modal
// ─────────────────────────────────────────────────────────────────────────────
const TopUpModal = ({
  isOpen,
  topUpAmount,
  setTopUpAmount,
  selectedMethod,
  setSelectedMethod,
  quickAmounts,
  paymentMethods,
  onClose,
  onSubmit,
  loading = false,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const original = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";
    const handleEscape = (e) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = original;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={!loading ? onClose : undefined}
      />
      <div className="relative z-10 flex items-center justify-center w-full h-full p-4 sm:p-6">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100 shrink-0">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              Top Up Wallet
            </h2>
            <button
              onClick={onClose}
              disabled={loading}
              className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {/* Amount */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Enter Amount
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-lg">
                  ৳
                </span>
                <input
                  type="number"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-10 pr-4 py-3 sm:py-4 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none text-lg sm:text-xl font-semibold"
                  min="10"
                  disabled={loading}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Minimum top-up: ৳10</p>
            </div>

            {/* Quick Amounts */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Quick Select
              </label>
              <div className="grid grid-cols-3 gap-2">
                {quickAmounts.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setTopUpAmount(amount.toString())}
                    disabled={loading}
                    className={`py-2.5 sm:py-3 px-2 rounded-xl border-2 font-semibold text-sm transition-colors disabled:opacity-50 ${
                      topUpAmount === amount.toString()
                        ? "border-orange-500 bg-orange-50 text-orange-600"
                        : "border-gray-200 hover:border-orange-300 text-gray-700"
                    }`}
                  >
                    ৳{amount.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Methods */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Payment Method
              </label>
              <div className="space-y-2">
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedMethod(method.id)}
                    disabled={loading}
                    className={`w-full p-3 sm:p-4 rounded-xl border-2 transition-all flex items-center gap-3 disabled:opacity-50 ${
                      selectedMethod === method.id
                        ? "border-orange-500 bg-orange-50"
                        : "border-gray-200 hover:border-orange-300"
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-white border border-gray-100 flex items-center justify-center p-1.5">
                      <img
                        src={method.image}
                        alt={method.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm sm:text-base">
                        {method.name}
                      </p>
                      <p className="text-xs text-gray-500">Instant transfer</p>
                    </div>
                    {selectedMethod === method.id && (
                      <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-6 border-t border-gray-100 shrink-0">
            <button
              onClick={onSubmit}
              disabled={
                !topUpAmount ||
                parseFloat(topUpAmount) < 10 ||
                !selectedMethod ||
                loading
              }
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold py-3.5 sm:py-4 rounded-xl hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Continue to Payment
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Wallet;