import { redirect } from "next/navigation";
import { CheckCircle2, Settings2, TriangleAlert, Wallet } from "lucide-react";

import { ActionForm } from "@/components/action-form";
import { Card, Field, inputCls, PageHeader } from "@/components/admin/ui";
import { NoAccess } from "@/components/admin/no-access";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getSettings } from "@/lib/settings";
import { paymentGatewayConfigured } from "@/lib/uddoktapay";
import { saveSettingsAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const { admin } = await getSession();
  if (!admin) redirect("/admin/login");
  if (!hasPermission(admin, "settings.manage")) return <NoAccess />;

  const settings = await getSettings();
  const gatewayReady = paymentGatewayConfigured();

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="System configuration" title="Settings" description="Store-wide configuration." />

      <div
        className={`flex items-start gap-3 rounded-2xl px-4 py-3 text-sm ring-1 ring-inset ${
          gatewayReady
            ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
            : "bg-amber-50 text-amber-800 ring-amber-200"
        }`}
      >
        {gatewayReady ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        ) : (
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
        )}
        <p>
          {gatewayReady
            ? "UddoktaPay credentials are configured on the server."
            : "UddoktaPay is not configured. Set UDDOKTAPAY_API_KEY and UDDOKTAPAY_BASE_URL in the environment. Wallet-only orders still work."}
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <ActionForm action={saveSettingsAction} submitLabel="Save settings" className="space-y-6">
          <Card title="Store" icon={Settings2}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Store name">
                <input name="storeName" defaultValue={settings.storeName} className={inputCls} />
              </Field>
              <Field label="Support URL">
                <input name="supportUrl" defaultValue={settings.supportUrl} className={inputCls} />
              </Field>
            </div>
          </Card>

          <Card title="Money limits" icon={Wallet}>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Minimum order (৳)">
                <input name="minOrderAmount" type="number" min="0" step="1" defaultValue={settings.minOrderAmount} className={inputCls} />
              </Field>
              <Field label="Minimum deposit (৳)">
                <input name="minDepositAmount" type="number" min="1" defaultValue={settings.minDepositAmount} className={inputCls} />
              </Field>
              <Field label="Maximum deposit (৳)">
                <input name="maxDepositAmount" type="number" min="1" defaultValue={settings.maxDepositAmount} className={inputCls} />
              </Field>
            </div>
            <div className="mt-4 max-w-xs">
              <Field label="Order polling (seconds)" hint="How often a customer's live order page checks for updates (3–30s).">
                <input
                  name="orderPollingSeconds"
                  type="number"
                  min="3"
                  max="30"
                  defaultValue={settings.orderPollingSeconds}
                  className={inputCls}
                />
              </Field>
            </div>
          </Card>

          <Card title="Feature switches" description="Turn store features on or off instantly.">
            <div className="divide-y divide-gray-100 rounded-xl border border-gray-200">
              <Toggle name="walletPaymentsEnabled" label="Allow wallet payments" defaultChecked={settings.walletPaymentsEnabled} />
              <Toggle name="walletDepositsEnabled" label="Allow wallet deposits" defaultChecked={settings.walletDepositsEnabled} />
              <Toggle name="maintenanceMode" label="Maintenance mode banner" defaultChecked={settings.maintenanceMode} />
            </div>
          </Card>
        </ActionForm>

        <Card title="Server environment" description="Payment credentials are never editable from the dashboard.">
          <pre className="overflow-x-auto rounded-xl bg-primary p-4 text-[11px] leading-relaxed text-gray-200">
{`DATABASE_URL=postgres://...
NEXT_PUBLIC_SITE_URL=https://your-domain.com
UDDOKTAPAY_API_KEY=...
UDDOKTAPAY_BASE_URL=https://pay.your-domain.com
NEXT_PUBLIC_GOOGLE_CLIENT_ID=... (optional)
GOOGLE_CLIENT_ID=... (optional)
UPLOAD_DIR=/var/lib/gontop/uploads`}
          </pre>
        </Card>
      </div>
    </div>
  );
}

function Toggle({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50">
      {label}
      <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
        <input type="checkbox" name={name} defaultChecked={defaultChecked} className="peer sr-only" />
        <span className="absolute inset-0 rounded-full bg-gray-300 transition peer-checked:bg-accent-orange peer-focus-visible:ring-2 peer-focus-visible:ring-accent-orange/40" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}
