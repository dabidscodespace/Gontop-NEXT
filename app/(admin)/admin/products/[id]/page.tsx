import { redirect } from "next/navigation";

import { NoAccess } from "@/components/admin/no-access";
import { ProductEditor } from "@/components/admin/product-editor";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import {
  getProductAdmin,
  listCategoriesAdmin,
  listGamesAdmin,
  listTopupMethodsAdmin,
} from "@/lib/services/admin-catalog";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ variation?: string; tab?: string }>;
}) {
  const { admin } = await getSession();
  if (!admin) redirect("/admin/login");
  if (!hasPermission(admin, "products.manage")) return <NoAccess />;

  const [{ id }, query] = await Promise.all([params, searchParams]);
  const productId = Number(id);
  const [product, games, topupMethods, categories] = await Promise.all([
    Number.isFinite(productId) ? getProductAdmin(productId) : Promise.resolve(null),
    listGamesAdmin(),
    listTopupMethodsAdmin(),
    listCategoriesAdmin(),
  ]);

  if (!product) redirect("/admin/products");

  return (
    <ProductEditor
      games={games}
      topupMethods={topupMethods}
      categories={categories}
      product={product}
      editingVariationId={query.variation ? Number(query.variation) : undefined}
      initialTab={query.tab}
    />
  );
}
