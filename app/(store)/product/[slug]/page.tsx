import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductCheckout } from "@/components/store/product-checkout";
import { getSession } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { getProductBySlug } from "@/lib/services/catalog";
import { getWalletBalance } from "@/lib/services/wallet";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getProductBySlug(slug);
  if (!data) return { title: "Product not found", robots: { index: false } };

  const description =
    data.product.shortDescription.replace(/<[^>]*>/g, "").trim().slice(0, 160) ||
    `Buy ${data.product.name} in Bangladesh at GONTOP. Instant delivery via bKash, Nagad & Rocket.`;

  return {
    title: `${data.product.name} - Buy in Bangladesh`,
    description,
    alternates: { canonical: `/product/${slug}` },
    openGraph: {
      title: `${data.product.name} - Buy in Bangladesh`,
      description,
      images: data.product.image ? [{ url: data.product.image }] : undefined,
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getProductBySlug(slug);
  if (!data) notFound();

  const [{ user }, settings] = await Promise.all([getSession(), getSettings()]);
  const balance = user ? await getWalletBalance(user.id) : 0;

  return (
    <div className="min-h-screen bg-accent-orange/10 text-white">
      <ProductCheckout
        product={{
          id: data.product.id,
          name: data.product.name,
          slug: data.product.slug,
          image: data.product.image,
          description: data.product.description,
          shortDescription: data.product.shortDescription,
          badges: data.product.badges ?? {},
          fields: data.fields,
          instructions: data.product.instructions,
        }}
        game={{
          name: data.game.name,
          instructions: data.game.instructions,
          image: data.game.image,
        }}
        variations={data.variations.map((variation) => ({
          id: variation.id,
          name: variation.name,
          description: variation.description,
          price: variation.price,
          compareAtPrice: variation.compareAtPrice,
          image: variation.image,
          stockStatus: variation.stockStatus,
          stockQuantity: variation.stockQuantity,
          fields: variation.fields,
          topupMethodName: variation.topupMethodName,
        }))}
        user={user ? { email: user.email, name: user.name } : null}
        walletBalance={balance}
        settings={{
          walletPaymentsEnabled: settings.walletPaymentsEnabled,
          minOrderAmount: settings.minOrderAmount,
        }}
      />
    </div>
  );
}
