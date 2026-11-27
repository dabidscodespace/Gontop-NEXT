import { redirect } from "next/navigation";
import {
  FileCheck2,
  FileText,
  Package,
  ReceiptText,
  ShieldCheck,
  Users,
} from "lucide-react";

import { Card, PageIdentity } from "@/components/admin/ui";
import { WorkspaceNav } from "@/components/admin/workspace-nav";
import { CsvImportPanel } from "@/components/admin/csv-import-panel";
import { CustomerMigrationPanel, OrderMigrationPanel } from "@/components/admin/data-migration-panel";
import { NoAccess } from "@/components/admin/no-access";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

type MigrationView = "products" | "customers" | "orders" | "guide";

export default async function AdminImportPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { admin } = await getSession();
  if (!admin) redirect("/admin/login");
  if (!hasPermission(admin, "csv.manage")) return <NoAccess />;

  const query = await searchParams;
  const view: MigrationView = ["customers", "orders", "guide"].includes(query.type ?? "")
    ? (query.type as MigrationView)
    : "products";

  return (
    <div className="space-y-5">
      <PageIdentity
        eyebrow="Controlled import laboratory"
        title="Data migration"
        description="A dedicated, preview-first environment for moving catalogue, customer and order history without mixing imports into everyday administration."
        icon={FileCheck2}
        tone="indigo"
        signal="Preview required"
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Step number="1" title="Products" description="Create the catalogue and package structure." active={view === "products"} />
        <Step number="2" title="Customers" description="Preserve registered account details by email." active={view === "customers"} />
        <Step number="3" title="Orders" description="Attach history to existing customers where possible." active={view === "orders"} />
      </div>

      <WorkspaceNav
        label="Migration data type"
        active={view}
        compact
        tone="indigo"
        items={[
          { key: "products", label: "Products", href: "/admin/import", icon: Package },
          { key: "customers", label: "Customers", href: "/admin/import?type=customers", icon: Users },
          { key: "orders", label: "Orders", href: "/admin/import?type=orders", icon: ReceiptText },
          { key: "guide", label: "Migration guide", href: "/admin/import?type=guide", icon: FileText },
        ]}
      />

      <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700"><ShieldCheck className="h-4 w-4" /></span>
        <div>
          <p className="font-extrabold">Preview is required before import</p>
          <p className="mt-0.5 text-xs leading-relaxed text-blue-700">The preview validates rows and shows new, existing, warning and error counts. Nothing is written until you confirm the validated preview.</p>
        </div>
      </div>

      {view === "products" && <CsvImportPanel />}
      {view === "customers" && <CustomerMigrationPanel />}
      {view === "orders" && <OrderMigrationPanel />}
      {view === "guide" && <MigrationGuide />}
    </div>
  );
}

function Step({ number, title, description, active }: { number: string; title: string; description: string; active: boolean }) {
  return (
    <div className={`flex items-start gap-3 rounded-2xl border p-4 transition ${active ? "border-orange-200 bg-orange-50/70 shadow-sm" : "border-gray-200 bg-white"}`}>
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-black ${active ? "bg-accent-orange text-white" : "bg-gray-100 text-gray-500"}`}>{number}</span>
      <div><p className="text-sm font-extrabold text-gray-900">{title}</p><p className="mt-0.5 text-[11px] leading-relaxed text-gray-500">{description}</p></div>
    </div>
  );
}

function MigrationGuide() {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card title="Recommended import order" icon={FileCheck2} description="Following this sequence preserves the most relationships.">
        <ol className="space-y-4">
          <GuideStep number="1" title="Import products" text="WooCommerce categories become games, variations become packages, and draft products stay inactive. Add player fields and game instructions after the import." />
          <GuideStep number="2" title="Import customers" text="Accounts are matched by normalized email. Existing emails are skipped, so rerunning the same file is safe." />
          <GuideStep number="3" title="Import orders" text="Orders attach to matching customer emails. Missing customers, including guest checkouts, are created automatically." />
        </ol>
      </Card>

      <Card title="What migration never changes" icon={ShieldCheck} description="Historical imports are deliberately isolated from live money movement.">
        <ul className="space-y-3 text-sm leading-relaxed text-gray-600">
          <SafetyItem text="Imported orders do not change wallet balances or create wallet ledger entries." />
          <SafetyItem text="Customer passwords cannot be imported. Customers can use Google with the same email or register again." />
          <SafetyItem text="Existing customer emails, product slugs and order numbers are detected and skipped rather than duplicated." />
          <SafetyItem text="Historical status, totals, line items, payment references, notes, player fields and refund totals are retained where the source export provides them." />
          <SafetyItem text="No ongoing WordPress or WooCommerce connection is required after import." />
        </ul>
      </Card>
    </div>
  );
}

function GuideStep({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-950 text-[10px] font-black text-white">{number}</span>
      <div><p className="text-sm font-extrabold text-gray-900">{title}</p><p className="mt-0.5 text-xs leading-relaxed text-gray-500">{text}</p></div>
    </li>
  );
}

function SafetyItem({ text }: { text: string }) {
  return <li className="flex gap-2.5"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" /><span>{text}</span></li>;
}
