import { redirect } from "next/navigation";
import {
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  HardDrive,
  Settings2,
  Store,
  TriangleAlert,
  Wallet,
  Wrench,
} from "lucide-react";

import { ActionForm } from "@/components/action-form";
import { Card, Field, inputCls, PageHeader } from "@/components/admin/ui";
import { SystemNav } from "@/components/admin/workspace-nav";
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
    <div className="space-y-5">
      <PageHeader
        eyebrow="System configuration"
        title="Store settings"
        description="Manage customer-facing identity, checkout limits, wallet availability and operational behavior from one controlled form."
      />

      <SystemNav admin={admin} active="settings" />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <SettingState label="Payment gateway" value={gatewayReady ? "Connected" : "Not configured"} good={gatewayReady} icon={CircleDollarSign} />
        <SettingState label="Wallet payments" value={settings.walletPaymentsEnabled ? "Allowed" : "Paused"} good={settings.walletPaymentsEnabled} icon={Wallet} />
        <SettingState label="Wallet deposits" value={settings.walletDepositsEnabled ? "Allowed" : "Paused"} good={settings.walletDepositsEnabled} icon={CircleDollarSign} />
        <SettingState label="Storefront mode" value={settings.maintenanceMode ? "Maintenance" : "Live"} good={!settings.maintenanceMode} icon={Store} />
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <ActionForm
          action={saveSettingsAction}
          submitLabel="Save all settings"
          className="space-y-5"
          submitAside={<p className="mr-auto text-xs font-semibold text-gray-500">All sections below are saved together.</p>}
          submitAreaClassName="sticky bottom-4 z-20 rounded-2xl border border-gray-200 bg-white/95 p-3 shadow-[0_12px_40px_rgba(16,24,40,0.14)] backdrop-blur"
        >
          <Card title="Store identity" icon={Store} description="The public name and support destination customers see.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Store name" hint="Used in customer-facing titles and messages.">
                <input name="storeName" defaultValue={settings.storeName} className={inputCls} />
              </Field>
              <Field label="Support URL" hint="Link customers can open when they need help.">
                <input name="supportUrl" defaultValue={settings.supportUrl} placeholder="https://... or /support" className={inputCls} />
              </Field>
            </div>
          </Card>

          <Card title="Checkout & deposit limits" icon={CircleDollarSign} description="Guardrails applied when customers place orders or add funds.">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Minimum order (৳)" hint="Use 0 for no minimum.">
                <input name="minOrderAmount" type="number" min="0" step="1" defaultValue={settings.minOrderAmount} className={inputCls} />
              </Field>
              <Field label="Minimum deposit (৳)">
                <input name="minDepositAmount" type="number" min="1" step="1" defaultValue={settings.minDepositAmount} className={inputCls} />
              </Field>
              <Field label="Maximum deposit (৳)">
                <input name="maxDepositAmount" type="number" min="1" step="1" defaultValue={settings.maxDepositAmount} className={inputCls} />
              </Field>
            </div>
            <p className="mt-3 rounded-xl bg-gray-50 px-3 py-2.5 text-[11px] leading-relaxed text-gray-500">The maximum deposit must remain greater than or equal to the minimum. The server validates this again before saving.</p>
          </Card>

          <Card title="Live order updates" icon={Clock3} description="Controls how quickly the customer's open order page checks for a new status.">
            <div className="max-w-sm">
              <Field label="Polling interval (seconds)" hint="Allowed range: 3–30 seconds. Lower values update faster but make more requests.">
                <input name="orderPollingSeconds" type="number" min="3" max="30" defaultValue={settings.orderPollingSeconds} className={inputCls} />
              </Field>
            </div>
          </Card>

          <Card title="Feature switches" icon={Settings2} description="Pause a customer flow without removing its data or changing historical records.">
            <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200">
              <Toggle name="walletPaymentsEnabled" label="Allow wallet payments" description="Customers can pay for an order using their available wallet balance." defaultChecked={settings.walletPaymentsEnabled} />
              <Toggle name="walletDepositsEnabled" label="Allow wallet deposits" description="Customers can create new gateway payments to add wallet funds." defaultChecked={settings.walletDepositsEnabled} />
              <Toggle name="maintenanceMode" label="Maintenance mode banner" description="Show the maintenance state on the storefront while administrators continue working." defaultChecked={settings.maintenanceMode} warning />
            </div>
          </Card>
        </ActionForm>

        <div className="space-y-5 xl:sticky xl:top-[84px]">
          <Card title="Payment gateway" icon={gatewayReady ? CheckCircle2 : TriangleAlert} description="Credentials are read from the server environment and cannot be edited in the dashboard.">
            <div className={`rounded-xl border p-3.5 ${gatewayReady ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
              <div className="flex items-center gap-2">
                {gatewayReady ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <TriangleAlert className="h-4 w-4 text-amber-600" />}
                <p className={`text-sm font-extrabold ${gatewayReady ? "text-emerald-800" : "text-amber-800"}`}>{gatewayReady ? "UddoktaPay is ready" : "UddoktaPay needs configuration"}</p>
              </div>
              <p className={`mt-1.5 text-xs leading-relaxed ${gatewayReady ? "text-emerald-700" : "text-amber-700"}`}>{gatewayReady ? "Gateway checkout and invoice verification can run from this deployment." : "Set UDDOKTAPAY_API_KEY and UDDOKTAPAY_BASE_URL on the server. Wallet-balance payments can still operate when enabled."}</p>
            </div>
          </Card>

          <Card title="Server environment" icon={HardDrive} description="Deployment-only values. Keep secrets outside source control and the browser.">
            <div className="space-y-2">
              <Environment name="DATABASE_URL" detail="PostgreSQL connection" secret />
              <Environment name="NEXT_PUBLIC_SITE_URL" detail="Canonical public URL" />
              <Environment name="UDDOKTAPAY_API_KEY" detail="Gateway secret" secret />
              <Environment name="UDDOKTAPAY_BASE_URL" detail="Gateway API origin" />
              <Environment name="GOOGLE_CLIENT_ID" detail="Optional Google sign-in" />
              <Environment name="UPLOAD_DIR" detail="Persistent upload storage" />
            </div>
          </Card>

          <div className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-sm shadow-sm">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-500"><Wrench className="h-4 w-4" /></span>
            <div><p className="font-extrabold text-gray-900">Changes are audited</p><p className="mt-0.5 text-xs leading-relaxed text-gray-500">Saving records the acting administrator and revalidates affected storefront settings.</p></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingState({ label, value, good, icon: Icon }: { label: string; value: string; good: boolean; icon: typeof Store }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.025)]">
      <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-[9px] font-black uppercase tracking-[0.12em] text-gray-400">{label}</p><p className="mt-2 truncate text-sm font-black text-gray-950">{value}</p></div><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${good ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}><Icon className="h-4 w-4" /></span></div>
    </div>
  );
}

function Toggle({ name, label, description, defaultChecked, warning = false }: { name: string; label: string; description: string; defaultChecked: boolean; warning?: boolean }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3.5 transition hover:bg-gray-50">
      <span><span className="block text-sm font-extrabold text-gray-800">{label}</span><span className="mt-0.5 block text-[11px] leading-relaxed text-gray-500">{description}</span>{warning && <span className="mt-1 block text-[10px] font-bold text-amber-600">Enable only during planned maintenance.</span>}</span>
      <span className="relative inline-flex h-6 w-11 shrink-0 items-center"><input type="checkbox" name={name} defaultChecked={defaultChecked} className="peer sr-only" /><span className="absolute inset-0 rounded-full bg-gray-300 transition peer-checked:bg-accent-orange peer-focus-visible:ring-2 peer-focus-visible:ring-accent-orange/40" /><span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" /></span>
    </label>
  );
}

function Environment({ name, detail, secret = false }: { name: string; detail: string; secret?: boolean }) {
  return <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5"><div className="min-w-0"><code className="block truncate text-[10px] font-black text-gray-700">{name}</code><p className="mt-0.5 text-[10px] text-gray-400">{detail}</p></div><span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase ${secret ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"}`}>{secret ? "Secret" : "Config"}</span></div>;
}
