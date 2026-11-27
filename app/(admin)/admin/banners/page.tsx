import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ExternalLink,
  Eye,
  EyeOff,
  Image as ImageIcon,
  ListOrdered,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import { ActionForm } from "@/components/action-form";
import { ImageField } from "@/components/image-field";
import {
  btnSecondary,
  Card,
  EmptyState,
  Field,
  inputCls,
  PageHeader,
  StatCard,
} from "@/components/admin/ui";
import { CommerceNav } from "@/components/admin/workspace-nav";
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
  const live = banners.filter((banner) => banner.isActive).length;
  const hidden = banners.length - live;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Storefront merchandising"
        title="Homepage banners"
        description="Build the carousel, control its order, and keep hidden drafts without losing them."
        actions={
          <>
            <a href="/" target="_blank" rel="noreferrer" className={btnSecondary}><ExternalLink className="h-4 w-4" /> View storefront</a>
            {editing && <Link href="/admin/banners" className={btnSecondary}><Plus className="h-4 w-4" /> New banner</Link>}
          </>
        }
      />

      <CommerceNav admin={admin} active="banners" />

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="All slides" value={banners.length.toLocaleString()} hint="Saved carousel banners" icon={ImageIcon} tone="blue" />
        <StatCard label="Live" value={live.toLocaleString()} hint="Visible on the homepage" icon={Eye} tone="emerald" />
        <StatCard label="Hidden" value={hidden.toLocaleString()} hint="Saved but not displayed" icon={EyeOff} tone="slate" />
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.75fr)]">
        <Card
          title="Carousel order"
          icon={ListOrdered}
          description="Lower position numbers appear first. Select a slide to edit it."
          padded={false}
        >
          <ul className="divide-y divide-gray-100">
            {banners.map((banner, index) => (
              <li key={banner.id} className={`p-4 transition ${editing?.id === banner.id ? "bg-orange-50/70" : "hover:bg-gray-50/70"}`}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="relative h-28 w-full shrink-0 overflow-hidden rounded-xl bg-gray-100 ring-1 ring-black/5 sm:h-20 sm:w-36">
                    <img src={banner.image} alt={banner.title || `Banner ${index + 1}`} className="h-full w-full object-cover" />
                    <span className="absolute left-2 top-2 flex h-6 min-w-6 items-center justify-center rounded-lg bg-gray-950/85 px-1.5 text-[10px] font-black text-white backdrop-blur-sm">{index + 1}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-extrabold text-gray-900">{banner.title || "Untitled banner"}</p>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset ${banner.isActive ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-gray-100 text-gray-500 ring-gray-200"}`}><span className={`h-1.5 w-1.5 rounded-full ${banner.isActive ? "bg-emerald-500" : "bg-gray-400"}`} />{banner.isActive ? "Live" : "Hidden"}</span>
                    </div>
                    <p className="mt-1 truncate text-xs text-gray-500">{banner.description || "No supporting description"}</p>
                    <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">Position {banner.sortOrder}{banner.link ? ` · Links to ${banner.link}` : " · No destination link"}</p>
                  </div>
                  <div className="flex shrink-0 items-center justify-end gap-1.5 sm:flex-col sm:items-end">
                    <Link href={`/admin/banners?edit=${banner.id}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 text-[11px] font-extrabold text-gray-600 shadow-sm transition hover:border-gray-900 hover:bg-gray-950 hover:text-white"><Pencil className="h-3.5 w-3.5" /> Edit</Link>
                    <ActionForm action={deleteBannerAction} submitLabel="Delete" confirm={`Delete “${banner.title || "this banner"}”?`} hideButton>
                      <input type="hidden" name="id" value={banner.id} />
                      <button type="submit" className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-extrabold text-red-500 transition hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
                    </ActionForm>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {banners.length === 0 && <EmptyState icon={ImageIcon} title="No carousel slides" description="Create the first banner to add a slide to the homepage carousel." />}
        </Card>

        <div className="xl:sticky xl:top-[84px]">
          <Card
            title={editing ? "Edit selected banner" : "Create a banner"}
            icon={editing ? Pencil : Plus}
            description={editing ? "Changes apply to this saved slide." : "Add one responsive image as a new carousel slide."}
          >
            <ActionForm action={saveBannerAction} submitLabel={editing ? "Save banner" : "Create banner"} className="space-y-4">
              {editing && <input type="hidden" name="id" value={editing.id} />}
              <ImageField label="Banner image" name="image" defaultValue={editing?.image ?? ""} hint="Use a wide image around 1200 × 400 px so it crops cleanly across devices." />
              <Field label="Title" hint="Short internal and accessible label for the slide.">
                <input name="title" defaultValue={editing?.title ?? ""} placeholder="Weekend offer" className={inputCls} />
              </Field>
              <Field label="Description" hint="Optional supporting copy stored with the banner.">
                <input name="description" defaultValue={editing?.description ?? ""} placeholder="Short campaign note" className={inputCls} />
              </Field>
              <Field label="Destination link" hint="Optional internal path such as /product/example.">
                <input name="link" defaultValue={editing?.link ?? ""} placeholder="/product/..." className={inputCls} />
              </Field>
              <div className="grid grid-cols-2 items-end gap-3">
                <Field label="Carousel position" hint="Lower appears first.">
                  <input name="sortOrder" type="number" defaultValue={String(editing?.sortOrder ?? banners.length)} className={inputCls} />
                </Field>
                <label className="flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-gray-200 px-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50">
                  <input type="checkbox" name="isActive" defaultChecked={editing ? editing.isActive : true} className="h-4 w-4 accent-orange-500" />
                  Live on site
                </label>
              </div>
            </ActionForm>
          </Card>
        </div>
      </div>
    </div>
  );
}
