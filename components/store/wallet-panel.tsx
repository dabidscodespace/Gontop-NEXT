"use client";

import { useRouter } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight, Loader2, Plus, Wallet } from "lucide-react";
import { useEffect, useState } from "react";

import { StatusBadge } from "@/components/status-badge";
import { formatBDT, money } from "@/lib/money";

type Transaction = {
  id: string;
  type: string;
  amount: string;
  balanceAfter: string;
  description: string;
  status: string;
  createdAt: Date | string;
};

const PRESETS = [100, 500, 1000, 2000];

export function WalletPanel({
  balance,
  transactions,
  minDeposit,
  maxDeposit,
  depositsEnabled,
  invoiceId,
}: {
  balance: number;
  transactions: Transaction[];
  minDeposit: number;
  maxDeposit: number;
  depositsEnabled: boolean;
  invoiceId?: string;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(String(PRESETS[1]));
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(Boolean(invoiceId));
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!invoiceId) return;
    let cancelled = false;
    fetch("/api/payments/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoice_id: invoiceId }),
    })
      .then(async (response) => {
        const data = await response.json();
        if (cancelled) return;
        if (!response.ok || !data.ok) throw new Error(data.error || "Could not verify the deposit.");
        if (data.status === "COMPLETED" || data.status === "ALREADY_PROCESSED") {
          setMessage(`Deposit confirmed. ${formatBDT(data.credited ?? 0)} added to your wallet.`);
        } else if (data.status === "PENDING") {
          setMessage("Your deposit is still being confirmed. Refresh in a moment.");
        } else {
          setError("The deposit was not completed.");
        }
        router.refresh();
      })
      .catch((verifyError) => {
        if (!cancelled) {
          setError(verifyError instanceof Error ? verifyError.message : "Could not verify the deposit.");
        }
      })
      .finally(() => {
        if (!cancelled) setVerifying(false);
      });

    return () => {
      cancelled = true;
    };
  }, [invoiceId, router]);

  async function deposit() {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/wallet/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(amount) }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not start the deposit.");
      window.location.href = data.paymentUrl;
    } catch (depositError) {
      setError(depositError instanceof Error ? depositError.message : "Could not start the deposit.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <section className="overflow-hidden rounded-2xl bg-primary p-5 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="flex items-center gap-1.5 text-xs text-white/60">
              <img src="/coin.png" alt="" className="h-4 w-4 object-contain" /> G Coin Balance
            </p>
            <p className="mt-1 text-3xl font-bold">{formatBDT(balance)}</p>
          </div>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
            <Wallet className="h-7 w-7 text-accent-orange" />
          </div>
        </div>
        <p className="mt-3 text-[11px] text-white/50">
          1 G Coin = ৳1. Use your balance for instant wallet orders.
        </p>
      </section>

      {(message || error || verifying) && (
        <div
          className={`rounded-xl border px-3 py-2 text-xs ${
            error
              ? "border-red-200 bg-red-50 text-red-600"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {verifying ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Confirming your deposit...
            </span>
          ) : (
            message || error
          )}
        </div>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-bold text-gray-800">Add G Coin</h2>
        {!depositsEnabled ? (
          <p className="mt-2 text-xs text-gray-500">Deposits are temporarily disabled.</p>
        ) : (
          <>
            <div className="mt-3 flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => setAmount(String(preset))}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    Number(amount) === preset
                      ? "border-accent-orange bg-accent-orange/10 text-accent-orange"
                      : "border-gray-200 text-gray-600 hover:border-orange-300"
                  }`}
                >
                  ৳{preset.toLocaleString()}
                </button>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                type="number"
                inputMode="decimal"
                min={minDeposit}
                max={maxDeposit}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="h-11 min-w-0 flex-1 rounded-lg border border-gray-300 px-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
              <button
                onClick={deposit}
                disabled={loading || money(amount) < minDeposit || money(amount) > maxDeposit}
                className="flex h-11 items-center gap-1.5 rounded-lg bg-accent-orange px-4 text-sm font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add
              </button>
            </div>
            <p className="mt-2 text-[11px] text-gray-400">
              Minimum ৳{minDeposit.toLocaleString()} · Maximum ৳{maxDeposit.toLocaleString()}. You
              will be redirected to UddoktaPay.
            </p>
          </>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-bold text-gray-800">Transaction history</h2>
        {transactions.length === 0 ? (
          <p className="mt-3 text-xs text-gray-500">No wallet transactions yet.</p>
        ) : (
          <div className="mt-2 divide-y divide-gray-100">
            {transactions.map((transaction) => {
              const positive = money(transaction.amount) > 0;
              return (
                <div key={transaction.id} className="flex items-center gap-3 py-2.5">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      positive ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"
                    }`}
                  >
                    {positive ? (
                      <ArrowDownLeft className="h-4 w-4" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold capitalize text-gray-800">
                      {transaction.type.replace(/_/g, " ")}
                    </p>
                    <p className="truncate text-[11px] text-gray-500">{transaction.description}</p>
                    <p className="text-[10px] text-gray-400">
                      {new Date(transaction.createdAt).toLocaleString("en-GB", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-bold ${
                        positive ? "text-emerald-600" : "text-gray-800"
                      }`}
                    >
                      {positive ? "+" : ""}
                      {formatBDT(transaction.amount)}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      bal. {formatBDT(transaction.balanceAfter)}
                    </p>
                    {transaction.status !== "completed" && (
                      <StatusBadge status={transaction.status} className="mt-0.5 scale-90" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
