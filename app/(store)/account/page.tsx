import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Package, User as UserIcon, Wallet } from "lucide-react";

import { PasswordForm, ProfileForm } from "@/components/store/account-forms";
import { getSession } from "@/lib/auth";
import { formatBDT } from "@/lib/money";
import { getWalletBalance } from "@/lib/services/wallet";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Account",
  robots: { index: false },
};

export default async function AccountPage() {
  const { user } = await getSession();
  if (!user) redirect("/login?next=/account");

  const balance = await getWalletBalance(user.id);

  return (
    <div className="min-h-screen bg-cover bg-center bg-repeat-y" style={{ backgroundImage: "url('/swiper_bg.svg')" }}>
      <div className="mx-auto max-w-3xl px-3 py-6">
        <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          {user.picture ? (
            <img src={user.picture} alt="" className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-orange">
              <UserIcon className="h-8 w-8 text-white" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold text-gray-900">{user.name || "GONTOP customer"}</h1>
            <p className="truncate text-sm text-gray-500">{user.email}</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <Link
            href="/wallet"
            className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition-colors hover:border-orange-300"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50">
              <Wallet className="h-5 w-5 text-accent-orange" />
            </div>
            <div>
              <p className="text-[11px] text-gray-500">G Coin</p>
              <p className="text-sm font-bold text-gray-800">{formatBDT(balance)}</p>
            </div>
          </Link>
          <Link
            href="/orders"
            className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition-colors hover:border-orange-300"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50">
              <Package className="h-5 w-5 text-accent-orange" />
            </div>
            <div>
              <p className="text-[11px] text-gray-500">Orders</p>
              <p className="text-sm font-bold text-gray-800">View history</p>
            </div>
          </Link>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-bold text-gray-800">Profile</h2>
            <ProfileForm
              defaultName={user.name}
              defaultPhone={user.phone}
              email={user.email}
            />
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-bold text-gray-800">Password</h2>
            <PasswordForm />
          </section>
        </div>
      </div>
    </div>
  );
}
