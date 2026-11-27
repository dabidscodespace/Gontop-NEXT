import { redirect } from "next/navigation";

import { NoAccess } from "@/components/admin/no-access";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

/** Games are managed inside the special Popular Games workspace. */
export default async function AdminGamesPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { admin } = await getSession();
  if (!admin) redirect("/admin/login");
  if (!hasPermission(admin, "categories.manage")) return <NoAccess />;

  const { edit } = await searchParams;
  const query = new URLSearchParams({ tab: "popular", view: "library" });
  if (edit) query.set("editGame", edit);
  redirect(`/admin/categories?${query.toString()}`);
}
