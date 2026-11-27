import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { WalletPanel } from "@/components/store/wallet-panel";
import { getSession } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { getWalletSummary } from "@/lib/services/wallet";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "G Coin Wallet",
  robots: { index: false },
};

export default async function WalletPage({
  searchParams,
}: {
  searchParams: Promise<{ invoice_id?: string }>;
}) {
  const [{ user }, params, settings] = await Promise.all([
    getSession(),
    searchParams,
    getSettings(),
  ]);
  if (!user) redirect("/login?next=/wallet");

  const summary = await getWalletSummary(user.id, 30);

  return (
    <div className="min-h-screen bg-cover bg-center bg-repeat-y" style={{ backgroundImage: "url('/swiper_bg.svg')" }}>
      <div className="mx-auto max-w-3xl px-3 py-6">
        <h1 className="text-xl font-bold text-gray-800">Wallet</h1>
        <p className="mt-1 text-sm text-gray-600">
          Deposit G Coin and pay for top-ups instantly.
        </p>

        <div className="mt-4">
          <WalletPanel
            balance={summary.balance}
            transactions={summary.transactions}
            minDeposit={settings.minDepositAmount}
            maxDeposit={settings.maxDepositAmount}
            depositsEnabled={settings.walletDepositsEnabled}
            invoiceId={params.invoice_id}
          />
        </div>
      </div>
    </div>
  );
}
