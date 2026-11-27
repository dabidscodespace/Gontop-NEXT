import Link from "next/link";
import { redirect } from "next/navigation";
import { Pencil, ShieldCheck, Trash2, UserPlus } from "lucide-react";

import { ActionForm } from "@/components/action-form";
import {
  btnSecondary,
  Card,
  EmptyState,
  Field,
  inputCls,
  PageHeader,
  selectCls,
} from "@/components/admin/ui";
import { NoAccess } from "@/components/admin/no-access";
import { getSession } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { listAdminUsers } from "@/lib/services/admin-catalog";
import { deleteAdminAction, saveAdminAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminAdminsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { admin } = await getSession();
  if (!admin) redirect("/admin/login");
  if (!hasPermission(admin, "staff.manage")) return <NoAccess />;

  const [{ edit }, admins] = await Promise.all([searchParams, listAdminUsers()]);
  const editing = edit ? admins.find((item) => item.id === edit) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admins & moderators"
        description="Only the owner can create staff and change permissions."
        actions={
          editing ? (
            <Link href="/admin/admins" className={btnSecondary}>
              <UserPlus className="h-4 w-4" /> New admin
            </Link>
          ) : undefined
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <div className="space-y-3">
          {admins.map((item) => (
            <Card key={item.id} className={editing?.id === item.id ? "ring-2 ring-accent-orange/40" : ""}>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary text-sm font-bold text-white">
                  {item.name.charAt(0).toUpperCase() || "A"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-gray-900">{item.name}</p>
                  <p className="truncate text-xs text-gray-400">{item.email}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
                    item.role === "owner" ? "bg-purple-50 text-purple-700" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {item.role}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    item.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                  }`}
                >
                  {item.isActive ? "Active" : "Disabled"}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-gray-100 pt-3">
                {item.role === "owner" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 text-[11px] font-medium text-purple-700">
                    <ShieldCheck className="h-3 w-3" /> Full access
                  </span>
                ) : item.permissions.length === 0 ? (
                  <span className="text-xs text-gray-400">No permissions granted</span>
                ) : (
                  item.permissions.map((permission) => (
                    <span key={permission} className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                      {PERMISSIONS[permission as keyof typeof PERMISSIONS] ?? permission}
                    </span>
                  ))
                )}
                <div className="ml-auto flex items-center gap-1">
                  <Link
                    href={`/admin/admins?edit=${item.id}`}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100 hover:text-accent-orange"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Link>
                  {item.id !== admin.id && (
                    <ActionForm
                      action={deleteAdminAction}
                      submitLabel="Delete"
                      confirm={`Delete admin ${item.email}?`}
                      hideButton
                    >
                      <input type="hidden" name="id" value={item.id} />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </ActionForm>
                  )}
                </div>
              </div>
            </Card>
          ))}
          {admins.length === 0 && <EmptyState icon={UserPlus} title="No staff accounts" description="Create a moderator to delegate work." />}
        </div>

        <Card title={editing ? `Edit ${editing.name}` : "Create moderator"} icon={editing ? Pencil : UserPlus}>
          <ActionForm
            action={saveAdminAction}
            submitLabel={editing ? "Save admin" : "Create admin"}
            className="space-y-4"
          >
            {editing && <input type="hidden" name="id" value={editing.id} />}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name">
                <input name="name" defaultValue={editing?.name ?? ""} required minLength={2} className={inputCls} />
              </Field>
              <Field label="Email">
                <input name="email" type="email" defaultValue={editing?.email ?? ""} required className={inputCls} />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={editing ? "New password" : "Password"} hint={editing ? "Leave blank to keep current." : "At least 8 characters."}>
                <input
                  name="password"
                  type="password"
                  minLength={editing ? undefined : 8}
                  required={!editing}
                  placeholder={editing ? "Unchanged" : "••••••••"}
                  className={inputCls}
                />
              </Field>
              <Field label="Role">
                <select name="role" defaultValue={editing?.role ?? "moderator"} className={selectCls}>
                  <option value="moderator">Moderator</option>
                  <option value="owner">Owner (full access)</option>
                </select>
              </Field>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold text-gray-600">Permissions</p>
              <div className="grid grid-cols-1 gap-1 rounded-xl border border-gray-200 bg-gray-50 p-2 sm:grid-cols-2">
                {Object.entries(PERMISSIONS).map(([key, label]) => (
                  <label
                    key={key}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-gray-700 transition hover:bg-white"
                  >
                    <input
                      type="checkbox"
                      name="permissions"
                      value={key}
                      defaultChecked={editing?.permissions.includes(key) ?? false}
                      className="h-4 w-4 accent-orange-500"
                    />
                    {label}
                  </label>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-gray-400">Owner accounts always have every permission.</p>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={editing ? editing.isActive : true}
                className="h-4 w-4 accent-orange-500"
              />
              Account active
            </label>
          </ActionForm>
        </Card>
      </div>
    </div>
  );
}
