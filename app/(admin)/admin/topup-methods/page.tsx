import Link from "next/link";
import { redirect } from "next/navigation";
import { KeyRound, Pencil, Plus, Trash2 } from "lucide-react";

import { ActionForm } from "@/components/action-form";
import {
  btnSecondary,
  Card,
  EmptyState,
  Field,
  inputCls,
  PageHeader,
  tdCls,
  thCls,
} from "@/components/admin/ui";
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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Checkout configuration"
        title="Top-up methods"
        description="How customers identify their account for a package, such as UID, Login or Server. Assign a method to a product, or override it on a single package."
        actions={
          editing ? (
            <Link href="/admin/topup-methods" className={btnSecondary}>
              <Plus className="h-4 w-4" /> New method
            </Link>
          ) : undefined
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card padded={false} title="All methods" icon={KeyRound}>
          {methods.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={KeyRound}
                title="No top-up methods yet"
                description="Add a method such as UID so products can ask customers for the right account detail."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px]">
                <thead className="border-b border-gray-100 bg-gray-50/70">
                  <tr>
                    <th className={thCls}>Method</th>
                    <th className={thCls}>Order</th>
                    <th className={thCls}>Status</th>
                    <th className={`${thCls} text-right`}>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {methods.map((method) => (
                    <tr
                      key={method.id}
                      className={editing?.id === method.id ? "bg-orange-50/60" : "hover:bg-gray-50/70"}
                    >
                      <td className={tdCls}>
                        <p className="font-bold text-primary">{method.name}</p>
                        <p className="text-xs text-gray-500">{method.key}</p>
                        {method.description && (
                          <p className="mt-1 text-xs text-gray-500">{method.description}</p>
                        )}
                      </td>
                      <td className={tdCls}>{method.sortOrder}</td>
                      <td className={tdCls}>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${
                            method.isActive
                              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                              : "bg-gray-100 text-gray-500 ring-gray-200"
                          }`}
                        >
                          {method.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className={tdCls}>
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/admin/topup-methods?edit=${method.id}`}
                            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-primary"
                            aria-label={`Edit ${method.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                          <ActionForm
                            action={deleteTopupMethodAction}
                            submitLabel="Delete"
                            confirm={`Delete the ${method.name} method? Products using it will have no method until you pick another. Existing orders keep the name they were placed with.`}
                            hideButton
                          >
                            <input type="hidden" name="id" value={method.id} />
                            <button
                              type="submit"
                              className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600"
                              aria-label={`Delete ${method.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </ActionForm>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title={editing ? "Edit method" : "Add method"} icon={Plus}>
          <ActionForm
            action={saveTopupMethodAction}
            submitLabel={editing ? "Save method" : "Create method"}
            className="space-y-4"
          >
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <Field label="Name" hint="Shown to customers, e.g. UID or Login ID.">
              <input name="name" defaultValue={editing?.name ?? ""} required maxLength={80} className={inputCls} />
            </Field>
            <Field label="Key" hint="Internal identifier. Leave blank to generate from the name.">
              <input
                name="key"
                defaultValue={editing?.key ?? ""}
                placeholder="uid"
                readOnly={Boolean(editing)}
                className={`${inputCls} ${editing ? "bg-gray-50 text-gray-500" : ""}`}
              />
            </Field>
            <Field label="Description" hint="Optional note for customers, e.g. where to find the UID.">
              <textarea
                name="description"
                rows={3}
                maxLength={500}
                defaultValue={editing?.description ?? ""}
                className={inputCls}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Display order">
                <input
                  name="sortOrder"
                  type="number"
                  defaultValue={String(editing?.sortOrder ?? 0)}
                  className={inputCls}
                />
              </Field>
              <label className="flex items-end gap-2 pb-3 text-sm font-semibold text-primary">
                <input
                  type="checkbox"
                  name="isActive"
                  defaultChecked={editing ? editing.isActive : true}
                  className="h-4 w-4 accent-orange-500"
                />
                Active
              </label>
            </div>
          </ActionForm>
        </Card>
      </div>
    </div>
  );
}
