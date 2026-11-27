// src/pages/Product.jsx
import { Gamepad2 } from "lucide-react";
import { useParams } from "react-router-dom";
import PackageSelection from "../components/PackageSelection";
import SEO from "../components/SEO";
import { useProduct } from "../hooks/useProduct";

const Product = () => {
  const { slug } = useParams();
  const { product, variations, loading } = useProduct(slug);

  if (loading && !product) return <LoadingState />;
  if (!product) return <NotFoundState />;

  const cleanDescription =
    product.short_description
      ?.replace(/<[^>]*>/g, "")
      ?.trim()
      ?.substring(0, 160) ||
    `Buy ${product.name} in Bangladesh at GONTOP. ` +
      `Instant delivery via bKash, Nagad & Rocket.`;

  return (
    <>
      <SEO
        title={`${product.name} - Buy in Bangladesh`}
        description={cleanDescription}
        image={product.images?.[0]?.src || product.image}
        url={`https://gontop.app/product/${slug}`}
        keywords={`${product.name}, buy ${product.name} bangladesh, ${product.name} top up, ${product.name} bkash, game top up bd, gontop`}
      />
      <div className="text-white">
        <PackageSelection product={product} variations={variations} />
      </div>
    </>
  );
};

// ── Loading State ──────────────────────────────────────────────
const LoadingState = () => (
  <>
    <SEO title="Loading..." noindex={true} />
    <div
      className="
        absolute top-16 left-0 right-0 bottom-0 z-20
        flex flex-col items-center justify-center
        bg-gradient-to-b from-[#1E1F29] via-[#20222E] to-[#1A1C26]
        text-white
      "
    >
      <div className="mb-8 flex flex-col items-center">
        <div className="relative mb-3">
          <div className="absolute inset-0 bg-orange-500/20 blur-2xl rounded-full animate-pulse" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-xl bg-[#262833] border border-[#3A3D4A] shadow-lg">
            <img
              src="/logo.png"
              alt="GONTOP"
              className="h-12 w-12 object-contain select-none"
            />
          </div>
        </div>
        <p className="text-sm font-semibold tracking-wide text-orange-400">
          Loading...
        </p>
      </div>

      <div className="relative w-72 h-3 bg-[#2A2C37] rounded-full overflow-hidden shadow-inner border border-[#3A3D4A]">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500 animate-[fillBar_1.8s_linear_infinite]" />
      </div>

      <p className="mt-6 text-xs text-gray-400 tracking-wide">
        Please wait while we load game data...
      </p>

      <style>{`
        @keyframes fillBar {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%);  }
        }
      `}</style>
    </div>
  </>
);

// ── Not Found State ────────────────────────────────────────────
const NotFoundState = () => (
  <>
    <SEO
      title="Product Not Found"
      description="This product doesn't exist."
      noindex={true}
    />
    <div className="bg-bg-primary flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="bg-bg-secondary border-border mx-auto flex h-16 w-16 items-center justify-center rounded-full border">
          <Gamepad2 className="text-text-muted h-8 w-8" />
        </div>
        <p className="text-text-primary mt-4 font-medium">Product not found</p>
        <p className="text-text-muted mt-1 text-sm">This game doesn't exist</p>
      </div>
    </div>
  </>
);

export default Product;
