import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle, ShieldCheck, Truck, Wallet } from "lucide-react";

import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "GONTOP is Bangladesh's most trusted game top-up platform. Buy PUBG UC, Mobile Legends Diamonds, Free Fire Diamonds and more. Instant delivery with bKash, Nagad & Rocket.",
};

export default async function AboutPage() {
  const settings = await getSettings();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-5xl px-4 pb-20">
        <header className="pt-8">
          <img src="/logo.png" className="h-20" alt="GONTOP logo" />
          <p className="text-lg text-gray-600">Great deals are guaranteed!</p>
        </header>

        <section className="mt-8 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-lg">
          <div className="p-6 md:flex md:items-center md:gap-10 md:p-10">
            <div className="flex-1">
              <h1 className="text-2xl font-bold md:text-3xl">
                Bangladesh&apos;s trusted game top-up store
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-gray-600">
                GONTOP makes it easy to top up PUBG UC, Mobile Legends diamonds, Free Fire
                diamonds and more. Pay with bKash, Nagad, Rocket or your G Coin wallet, and your
                top-up is delivered quickly by our team.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {["/assets/Bkash.png", "/assets/Nagad.png", "/assets/rocket.png"].map((logo) => (
                  <div
                    key={logo}
                    className="flex h-10 w-20 items-center justify-center rounded-lg border border-gray-200 bg-white p-1"
                  >
                    <img src={logo} alt="Payment method" className="max-h-7 max-w-full object-contain" />
                  </div>
                ))}
              </div>
            </div>
            <img
              src="/assets/banner.avif"
              alt="GONTOP promotions"
              className="mt-6 w-full max-w-sm rounded-2xl object-contain md:mt-0"
            />
          </div>
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            {
              icon: Truck,
              title: "Fast delivery",
              body: "Orders are processed as soon as payment is confirmed.",
            },
            {
              icon: ShieldCheck,
              title: "Safe payments",
              body: "Payments are verified on our server with UddoktaPay.",
            },
            {
              icon: Wallet,
              title: "G Coin wallet",
              body: "Deposit once and pay for top-ups instantly.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50">
                <item.icon className="h-5 w-5 text-accent-orange" />
              </div>
              <h2 className="mt-3 text-sm font-bold text-gray-800">{item.title}</h2>
              <p className="mt-1 text-xs leading-relaxed text-gray-500">{item.body}</p>
            </div>
          ))}
        </section>

        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-gray-800">Need help?</h2>
          <p className="mt-1 text-sm text-gray-600">
            Our support team can help with orders, payments and refunds.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={settings.supportUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-accent-orange px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
            >
              <MessageCircle className="h-4 w-4" /> Message us
            </a>
            <Link
              href="/"
              className="inline-flex items-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-accent-orange hover:text-accent-orange"
            >
              Browse games
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
