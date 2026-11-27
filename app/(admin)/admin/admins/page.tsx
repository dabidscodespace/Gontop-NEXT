import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CheckCircle2,
  Clock3,
  KeyRound,
  Pencil,
  Shield,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  UsersRound,
  UserX,
} from "lucide-react";

import { ActionForm } from "@/components/action-form";
import {
  btnOnDark,
  Card,
  EmptyState,
  Field,
  inputCls,
  PageIdentity,
  selectCls,
  StatCard,
} from "@/components/admin/ui";
import { NoAccess } from "@/components/admin/no-access";
import { getSession } from "@/lib/auth";
import { hasPermission, PERMISSIONS, type Permission } from "@/lib/permissions";
import { listAdminUsers } from "@/lib/services/admin-catalog";
import { deleteAdminAction, saveAdminAction } from "../actions";

export const dynamic = "force-dynamic";

const PERMISSION_GROUPS: Array<{ title: string; description: string; keys: Permission[] }> = [
  {
    title: "Orders & fulfillment",
    description: "Daily order queue, status changes, delivery and refunds.",
    keys: ["dashboard.view", "orders.view", "orders.update_status", "orders.process", "refunds.process"],
  },
  {
    title: "Catalogue & storefront",
    description: "Products, packages, categories, games and homepage banners.",
    keys: ["products.manage", "categories.manage", "banners.manage"],
  },
  {
    title: "Customers & money",
    description: "Customer accounts, gateway records, wallet ledger and reporting.",
    keys: ["customers.view", "payments.view", "wallet.manage", "reports.view"],
  },
  {
    title: "System administration",
    description: "Store configuration, migrations and other staff accounts.",
    keys: ["settings.manage", "csv.manage", "staff.manage"],
  },
];

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
  const owners = admins.filter((item) => item.role === "owner").length;
  const moderators = admins.length - owners;
  const disabled = admins.filter((item) => !item.isActive).length;

  return (
    <div className="space-y-5">
      <PageIdentity
        eyebrow="Security & access"
        title="Team access"
        description="A dedicated identity and permission workspace for owners and moderators, isolated from store configuration."
        icon={ShieldCheck}
        tone="violet"
        signal={`${admins.filter((item) => item.isActive).length} active staff`}
        actions={editing ? <Link href="/admin/admins" className={btnOnDark}><UserPlus className="h-4 w-4" /> New staff account</Link> : undefined}
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Team accounts" value={admins.length.toLocaleString()} hint="Owners and moderators" icon={UsersRound} tone="blue" />
        <StatCard label="Owners" value={owners.toLocaleString()} hint="Always have full access" icon={ShieldCheck} tone="violet" />
        <StatCard label="Moderators" value={moderators.toLocaleString()} hint="Permission-based access" icon={Shield} tone="orange" />
        <StatCard label="Disabled" value={disabled.toLocaleString()} hint="Sign-in is blocked" icon={UserX} tone="slate" />
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)]">
        <Card title="Staff directory" icon={UsersRound} description="Owners are unrestricted. Moderators only see and use the areas explicitly granted to them." padded={false}>
          <ul className="divide-y divide-gray-100">
            {admins.map((item) => {
              const isCurrent = item.id === admin.id;
              const visiblePermissions = item.permissions.slice(0, 4);
              const remaining = Math.max(0, item.permissions.length - visiblePermissions.length);
              return (
                <li key={item.id} className={`p-4 transition ${editing?.id === item.id ? "bg-orange-50/70" : "hover:bg-gray-50/70"}`}>
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gray-950 to-gray-700 text-sm font-black text-white">{(item.name || item.email).charAt(0).toUpperCase()}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-extrabold text-gray-950">{item.name || "Unnamed administrator"}</p>
                        {isCurrent && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-blue-600">You</span>}
                        <RoleBadge role={item.role} />
                        <AccessBadge active={item.isActive} />
                      </div>
                      <p className="mt-1 truncate text-xs text-gray-500">{item.email}</p>
                      <p className="mt-1 flex items-center gap-1.5 text-[10px] text-gray-400"><Clock3 className="h-3 w-3" /> {item.lastLoginAt ? `Last signed in ${new Date(item.lastLoginAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}` : "Has not signed in yet"}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Link href={`/admin/admins?edit=${item.id}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 text-[11px] font-extrabold text-gray-600 shadow-sm transition hover:border-gray-900 hover:bg-gray-950 hover:text-white"><Pencil className="h-3.5 w-3.5" /> Edit</Link>
                      {!isCurrent && (
                        <ActionForm action={deleteAdminAction} submitLabel="Delete" confirm={`Delete admin ${item.email}? Their historical audit references will be retained where supported.`} hideButton>
                          <input type="hidden" name="id" value={item.id} />
                          <button type="submit" className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-600" aria-label={`Delete ${item.name}`}><Trash2 className="h-4 w-4" /></button>
                        </ActionForm>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-gray-100 pt-3">
                    {item.role === "owner" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-bold text-violet-700"><ShieldCheck className="h-3 w-3" /> Full access to every area</span>
                    ) : item.permissions.length === 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700"><KeyRound className="h-3 w-3" /> No permissions granted</span>
                    ) : (
                      <>
                        {visiblePermissions.map((permission) => <span key={permission} className="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-bold text-gray-600">{PERMISSIONS[permission as Permission] ?? permission}</span>)}
                        {remaining > 0 && <span className="rounded-full bg-gray-950 px-2 py-1 text-[10px] font-bold text-white">+{remaining} more</span>}
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          {admins.length === 0 && <EmptyState icon={UserPlus} title="No staff accounts" description="Create a moderator to delegate operational work." />}
        </Card>

        <div className="xl:sticky xl:top-[84px]">
          <Card
            title={editing ? `Edit ${editing.name || editing.email}` : "Create staff account"}
            icon={editing ? Pencil : UserPlus}
            description={editing ? "Update identity, access state, role or granular permissions." : "Start with the smallest set of permissions needed for the person's work."}
          >
            <ActionForm action={saveAdminAction} submitLabel={editing ? "Save staff account" : "Create staff account"} className="space-y-5">
              {editing && <input type="hidden" name="id" value={editing.id} />}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Name"><input name="name" defaultValue={editing?.name ?? ""} required minLength={2} className={inputCls} /></Field>
                <Field label="Email"><input name="email" type="email" defaultValue={editing?.email ?? ""} required className={inputCls} /></Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={editing ? "New password" : "Temporary password"} hint={editing ? "Leave blank to keep the current password." : "At least 8 characters. Share it securely."}>
                  <input name="password" type="password" minLength={editing ? undefined : 8} required={!editing} placeholder={editing ? "Unchanged" : "At least 8 characters"} className={inputCls} />
                </Field>
                <Field label="Role" hint="Owners ignore granular permission selection.">
                  <select name="role" defaultValue={editing?.role ?? "moderator"} className={selectCls}><option value="moderator">Moderator</option><option value="owner">Owner · full access</option></select>
                </Field>
              </div>

              <div>
                <div className="mb-2"><p className="text-xs font-extrabold text-gray-700">Moderator permissions</p><p className="mt-0.5 text-[11px] text-gray-400">Grouped by the work they unlock. Owner accounts always have every permission.</p></div>
                <div className="space-y-2">
                  {PERMISSION_GROUPS.map((group) => (
                    <fieldset key={group.title} className="rounded-xl border border-gray-200 p-3">
                      <legend className="px-1 text-[10px] font-black uppercase tracking-[0.1em] text-gray-500">{group.title}</legend>
                      <p className="mb-2 text-[10px] leading-relaxed text-gray-400">{group.description}</p>
                      <div className="grid gap-1 sm:grid-cols-2">
                        {group.keys.map((key) => (
                          <label key={key} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50">
                            <input type="checkbox" name="permissions" value={key} defaultChecked={editing?.permissions.includes(key) ?? false} className="h-4 w-4 accent-orange-500" />
                            {PERMISSIONS[key]}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  ))}
                </div>
              </div>

              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50/60 p-3.5">
                <span><span className="block text-sm font-extrabold text-gray-800">Account active</span><span className="mt-0.5 block text-[11px] text-gray-500">Disabled staff cannot sign in, but their record remains.</span></span>
                <span className="relative inline-flex h-6 w-11 shrink-0 items-center"><input type="checkbox" name="isActive" defaultChecked={editing ? editing.isActive : true} className="peer sr-only" /><span className="absolute inset-0 rounded-full bg-gray-300 transition peer-checked:bg-accent-orange" /><span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" /></span>
              </label>

              {editing?.id === admin.id && <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs leading-relaxed text-blue-700"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" /> You are editing your own account. Server safeguards prevent removing the last owner.</div>}
            </ActionForm>
          </Card>
        </div>
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  return <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${role === "owner" ? "bg-violet-50 text-violet-700" : "bg-gray-100 text-gray-600"}`}>{role}</span>;
}

function AccessBadge({ active }: { active: boolean }) {
  const Icon = active ? UserCheck : UserX;
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}><Icon className="h-2.5 w-2.5" />{active ? "Active" : "Disabled"}</span>;
}
