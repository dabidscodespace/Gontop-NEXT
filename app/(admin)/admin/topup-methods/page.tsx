import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Eye,
  EyeOff,
  KeyRound,
  Link2,
  Package,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import { ActionForm } from "@/components/action-form";
import {
  btnSecondary,
  Card,
  EmptyState,
  Field,
  inputCls,
  PageHeader,
  StatCard,
  textareaCls,
} from "@/components/admin/ui";
import { CommerceNav } from "@/components/admin/workspace-nav";
import { NoAccess } from "@/components/admin/no-access";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { listTopupMethodsAdmin } from "@/lib/services/admin-catalog";
import { deleteTopupMethodAction, saveTopupMethodAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminTopupMethodsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { admin } = await getSession();
  if (!admin) redirect("/admin/login");
  if (!hasPermission(admin, "products.manage")) return <NoAccess />;

  const [{ edit }, methods] = await Promise.all([searchParams, listTopupMethodsAdmin()]);
  const editing = edit ? methods.find((method) => method.id === Number(edit)) : null;
  const active = methods.filter((method) => method.isActive).length;
  const inactive = methods.length - active;
  const assigned = methods.filter((method) => method.productCount + method.packageCount > 0).length;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Checkout configuration"
        title="Top-up methods"
        description="Define the customer account identifier a product or package asks for, such as UID, Login ID or Server."
        actions={editing ? <Link href="/admin/topup-methods" className={btnSecondary}><Plus className="h-4 w-4" /> New method</Link> : undefined}
      />

      <CommerceNav admin={admin} active="methods" />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="All methods" value={methods.length.toLocaleString()} hint="Saved identifier types" icon={KeyRound} tone="blue" />
        <StatCard label="Active" value={active.toLocaleString()} hint="Available to assign" icon={Eye} tone="emerald" />
        <StatCard label="Inactive" value={inactive.toLocaleString()} hint="Kept but unavailable" icon={EyeOff} tone="slate" />
        <StatCard label="In use" value={assigned.toLocaleString()} hint="Assigned to products or packages" icon={Link2} tone="orange" />
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.75fr)]">
        <Card
          title="Identifier library"
          icon={KeyRound}
          description="Product-level assignments act as the default; a package can override them when needed."
          padded={false}
        >
          {methods.length === 0 ? (
            <EmptyState icon={KeyRound} title="No top-up methods yet" description="Create a method before configuring products that need a customer account identifier." />
          ) : (
            <ul className="divide-y divide-gray-100">
              {methods.map((method) => {
                const usage = method.productCount + method.packageCount;
                return (
                  <li key={method.id} className={`p-4 transition ${editing?.id === method.id ? "bg-orange-50/70" : "hover:bg-gray-50/70"}`}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${method.isActive ? "bg-orange-50 text-accent-orange ring-orange-100" : "bg-gray-100 text-gray-400 ring-gray-200"}`}><KeyRound className="h-4 w-4" /></span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-extrabold text-gray-950">{method.name}</p>
                          <code className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-500">{method.key}</code>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset ${method.isActive ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-gray-100 text-gray-500 ring-gray-200"}`}>{method.isActive ? "Active" : "Inactive"}</span>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-gray-500">{method.description || "No customer guidance has been added."}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <UsageChip label="Product defaults" value={method.productCount} />
                          <UsageChip label="Package overrides" value={method.packageCount} />
                          <span className="rounded-lg bg-gray-50 px-2 py-1 text-[10px] font-bold text-gray-400">Position {method.sortOrder}</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center justify-end gap-1">
                        <Link href={`/admin/topup-methods?edit=${method.id}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 text-[11px] font-extrabold text-gray-600 shadow-sm transition hover:border-gray-900 hover:bg-gray-950 hover:text-white" aria-label={`Edit ${method.name}`}><Pencil className="h-3.5 w-3.5" /> Edit</Link>
                        <ActionForm action={deleteTopupMethodAction} submitLabel="Delete" confirm={`Delete the ${method.name} method? ${usage > 0 ? `${method.productCount} product default(s) and ${method.packageCount} package override(s) will lose this assignment. ` : ""}Existing orders keep the method name captured at checkout.`} hideButton>
                          <input type="hidden" name="id" value={method.id} />
                          <button type="submit" className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-600" aria-label={`Delete ${method.name}`}><Trash2 className="h-4 w-4" /></button>
                        </ActionForm>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div className="xl:sticky xl:top-[84px]">
          <Card
            title={editing ? `Edit ${editing.name}` : "Create a method"}
            icon={editing ? Pencil : Plus}
            description={editing ? "The key stays fixed so existing assignments remain stable." : "Create a reusable identifier that products and packages can request."}
          >
            <ActionForm action={saveTopupMethodAction} submitLabel={editing ? "Save method" : "Create method"} className="space-y-4">
              {editing && <input type="hidden" name="id" value={editing.id} />}
              <Field label="Customer-facing name" hint="For example UID, Login ID or Player ID.">
                <input name="name" defaultValue={editing?.name ?? ""} placeholder="UID" required maxLength={80} className={inputCls} />
              </Field>
              <Field label="Internal key" hint={editing ? "Keys cannot change after creation." : "Leave blank to generate it from the name."}>
                <input name="key" defaultValue={editing?.key ?? ""} placeholder="uid" readOnly={Boolean(editing)} className={`${inputCls} ${editing ? "bg-gray-50 text-gray-500" : ""}`} />
              </Field>
              <Field label="Customer guidance" hint="Explain where the customer can find this value.">
                <textarea name="description" rows={3} maxLength={500} defaultValue={editing?.description ?? ""} placeholder="Find this in your in-game profile." className={textareaCls} />
              </Field>
              <div className="grid grid-cols-2 items-end gap-3">
                <Field label="Display order" hint="Lower appears first.">
                  <input name="sortOrder" type="number" defaultValue={String(editing?.sortOrder ?? methods.length)} className={inputCls} />
                </Field>
                <label className="flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-gray-200 px-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50">
                  <input type="checkbox" name="isActive" defaultChecked={editing ? editing.isActive : true} className="h-4 w-4 accent-orange-500" /> Active
                </label>
              </div>
              {editing && editing.productCount + editing.packageCount > 0 && (
                <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs leading-relaxed text-blue-800"><Package className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Used by {editing.productCount} product default(s) and {editing.packageCount} package override(s).</div>
              )}
            </ActionForm>
          </Card>
        </div>
      </div>
    </div>
  );
}

function UsageChip({ label, value }: { label: string; value: number }) {
  return <span className="rounded-lg bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">{label}: {value.toLocaleString()}</span>;
}
