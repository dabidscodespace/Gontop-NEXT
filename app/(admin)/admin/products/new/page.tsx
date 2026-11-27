import { redirect } from "next/navigation";

import { NoAccess } from "@/components/admin/no-access";
import { ProductEditor } from "@/components/admin/product-editor";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { listGamesAdmin, listTopupMethodsAdmin } from "@/lib/services/admin-catalog";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const { admin } = await getSession();
  if (!admin) redirect("/admin/login");
  if (!hasPermission(admin, "products.manage")) return <NoAccess />;

  const [games, topupMethods] = await Promise.all([listGamesAdmin(), listTopupMethodsAdmin()]);

  return (
    <div className="space-y-4">
      {games.length === 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Create a game first so this product can be assigned to it.
        </div>
      )}
      <ProductEditor games={games} topupMethods={topupMethods} product={null} />
    </div>
  );
}
