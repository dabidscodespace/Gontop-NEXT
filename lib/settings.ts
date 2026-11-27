import "server-only";

import { eq } from "drizzle-orm";

import { settings } from "@/db/schema";
import { getDb } from "@/lib/db";
import { money } from "@/lib/money";

export type StoreSettings = {
  storeName: string;
  supportUrl: string;
  currency: string;
  minOrderAmount: number;
  walletPaymentsEnabled: boolean;
  walletDepositsEnabled: boolean;
  minDepositAmount: number;
  maxDepositAmount: number;
  maintenanceMode: boolean;
  orderPollingSeconds: number;
};

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: "GONTOP",
  supportUrl: "https://m.me/gontopofficial",
  currency: "BDT",
  minOrderAmount: 10,
  walletPaymentsEnabled: true,
  walletDepositsEnabled: true,
  minDepositAmount: 10,
  maxDepositAmount: 100000,
  maintenanceMode: false,
  orderPollingSeconds: 4,
};

const SETTINGS_KEY = "store";

export async function getSettings(): Promise<StoreSettings> {
  const db = await getDb();
  const rows = await db.select().from(settings).where(eq(settings.key, SETTINGS_KEY)).limit(1);
  const stored = (rows[0]?.value ?? {}) as Partial<StoreSettings>;

  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    minOrderAmount: money(stored.minOrderAmount ?? DEFAULT_SETTINGS.minOrderAmount),
    minDepositAmount: money(stored.minDepositAmount ?? DEFAULT_SETTINGS.minDepositAmount),
    maxDepositAmount: money(stored.maxDepositAmount ?? DEFAULT_SETTINGS.maxDepositAmount),
    orderPollingSeconds: Math.min(
      30,
      Math.max(3, Number(stored.orderPollingSeconds ?? DEFAULT_SETTINGS.orderPollingSeconds)),
    ),
  };
}

export async function saveSettings(patch: Partial<StoreSettings>) {
  const db = await getDb();
  const current = await getSettings();
  const next = { ...current, ...patch };

  await db
    .insert(settings)
    .values({ key: SETTINGS_KEY, value: next })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: next, updatedAt: new Date() },
    });

  return next;
}
