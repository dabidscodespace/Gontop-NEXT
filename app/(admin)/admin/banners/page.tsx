import Link from "next/link";
import { redirect } from "next/navigation";
import { Image as ImageIcon, Pencil, Plus, Trash2 } from "lucide-react";

import { ActionForm } from "@/components/action-form";
import { ImageField } from "@/components/image-field";
import { Card, EmptyState, Field, inputCls, PageHeader, btnSecondary } from "@/components/admin/ui";
import { NoAccess } from "@/components/admin/no-access";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { listBannersAdmin } from "@/lib/services/admin-catalog";
import { deleteBannerAction, saveBannerAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminBannersPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { admin } = await getSession();
  if (!admin) redirect("/admin/login");
  if (!hasPermission(admin, "banners.manage")) return <NoAccess />;

  const [{ edit }, banners] = await Promise.all([searchParams, listBannersAdmin()]);
  const editing = edit ? banners.find((banner) => banner.id === Number(edit)) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Storefront merchandising"
        title="Banners"
        description="One responsive image per banner, shown in the homepage carousel."
        actions={
          editing ? (
            <Link href="/admin/banners" className={btnSecondary}>
              <Plus className="h-4 w-4" /> New banner
            </Link>
          ) : undefined
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <Card title="Carousel slides" icon={ImageIcon} padded={false}>
          <ul className="divide-y divide-gray-100">
            {banners.map((banner) => (
              <li
                key={banner.id}
                className={`flex gap-4 p-4 transition ${editing?.id === banner.id ? "bg-orange-50/60" : "hover:bg-gray-50/70"}`}
              >
                <div className="h-20 w-36 shrink-0 overflow-hidden rounded-xl bg-gray-100 ring-1 ring-black/5">
                  <img src={banner.image} alt={banner.title} className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-bold text-gray-900">{banner.title || "Untitled banner"}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        banner.isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {banner.isActive ? "Live" : "Hidden"}
                    </span>
                  </div>
                  <p className="truncate text-xs text-gray-500">{banner.description || "No description"}</p>
                  <p className="mt-1 text-[11px] text-gray-400">
                    Position {banner.sortOrder}
                    {banner.link && <span className="text-blue-500"> · {banner.link}</span>}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <Link
                    href={`/admin/banners?edit=${banner.id}`}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100 hover:text-accent-orange"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Link>
                  <ActionForm
                    action={deleteBannerAction}
                    submitLabel="Delete"
                    confirm="Delete this banner?"
                    hideButton
                  >
                    <input type="hidden" name="id" value={banner.id} />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </ActionForm>
                </div>
              </li>
            ))}
          </ul>
          {banners.length === 0 && (
            <EmptyState icon={ImageIcon} title="No banners yet" description="Add a banner to fill the homepage carousel." />
          )}
        </Card>

        <Card
          title={editing ? "Edit banner" : "Add banner"}
          icon={editing ? Pencil : Plus}
        >
          <ActionForm
            action={saveBannerAction}
            submitLabel={editing ? "Save banner" : "Create banner"}
            className="space-y-4"
          >
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <ImageField
              label="Banner image"
              name="image"
              defaultValue={editing?.image ?? ""}
              hint="Recommended wide image, e.g. 1200×400."
            />
            <Field label="Title">
              <input name="title" defaultValue={editing?.title ?? ""} className={inputCls} />
            </Field>
            <Field label="Description">
              <input name="description" defaultValue={editing?.description ?? ""} className={inputCls} />
            </Field>
            <Field label="Destination link" hint="Optional, e.g. /product/...">
              <input name="link" defaultValue={editing?.link ?? ""} placeholder="/product/..." className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 items-end gap-3">
              <Field label="Position">
                <input name="sortOrder" type="number" defaultValue={String(editing?.sortOrder ?? 0)} className={inputCls} />
              </Field>
              <label className="flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-gray-200 px-3 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  name="isActive"
                  defaultChecked={editing ? editing.isActive : true}
                  className="h-4 w-4 accent-orange-500"
                />
                Live on site
              </label>
            </div>
          </ActionForm>
        </Card>
      </div>
    </div>
  );
}
