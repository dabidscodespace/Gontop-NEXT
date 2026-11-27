import Link from "next/link";
import { Gamepad2, XCircle } from "lucide-react";

import type { HomeCard } from "@/lib/services/catalog";

/**
 * Original product card. With `onOpen` it renders as a button (used for Popular Games parents
 * with regional variants); otherwise it is a link to the product page.
 */
export function ProductCard({ product, onOpen }: { product: HomeCard; onOpen?: () => void }) {
  const isOut =
    product.stockStatus === "outofstock" || product.stockQuantity === 0;

  const className = `group relative block w-full overflow-hidden rounded-2xl bg-white p-3 text-left shadow-[0_6px_12px_rgba(0,0,0,0.18),inset_0_-4px_0_0_#f96000] transition-all duration-300 ${
    isOut
      ? "cursor-not-allowed"
      : "cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_8px_16px_rgba(0,0,0,0.24),inset_0_0_0_3px_#f96000]"
  }`;

  const body = (
    <>
      {!isOut && product.stockQuantity !== null && (
        <div className="absolute left-3 top-3 z-10 rounded border border-green-500 bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-600">
          ×{product.stockQuantity}
        </div>
      )}

      {isOut && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/90">
          <XCircle className="mb-1 h-6 w-6 animate-pulse text-red-500" />
          <span className="text-xs font-semibold uppercase tracking-widest text-red-600">
            Stock Out
          </span>
        </div>
      )}

      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-gray-100">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className={`h-full w-full object-cover transition-transform duration-300 ${
              isOut ? "opacity-75 grayscale" : "group-hover:scale-105"
            }`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Gamepad2 className="h-10 w-10 text-gray-400" />
          </div>
        )}
      </div>

      <div className="mt-3 flex h-8 items-center justify-center text-center">
        <p
          className={`line-clamp-2 text-xs font-semibold transition-colors duration-300 md:text-sm ${
            isOut ? "text-gray-400" : "text-black group-hover:text-accent-orange"
          }`}
        >
          {product.name}
        </p>
      </div>
    </>
  );

  if (onOpen) {
    return (
      <button type="button" onClick={onOpen} className={className}>
        {body}
      </button>
    );
  }

  return (
    <Link href={isOut ? "#" : product.href} aria-disabled={isOut} className={className}>
      {body}
    </Link>
  );
}

/** Grid of cards. Items with `variants` open `onOpen` (when given); all others link. */
export function ProductGrid({
  products,
  onOpen,
}: {
  products: HomeCard[];
  onOpen?: (product: HomeCard) => void;
}) {
  return (
    <div className="grid grid-cols-3 items-stretch gap-3 md:grid-cols-4 md:gap-6 lg:grid-cols-5">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onOpen={product.variants?.length && onOpen ? () => onOpen(product) : undefined}
        />
      ))}
    </div>
  );
}
