import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { Gamepad2, XCircle, ChevronRight } from "lucide-react";
import { useHomepage } from "../context/HomepageContext";
import { HOMEPAGE_CATEGORIES } from "../api/config";
import { globalCache } from "../api/utils/globalCache";
import { getProductsByCategoryId } from "../api";
import GameModal from "./GameModal";

export default function PopularGames() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalProducts, setModalProducts] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const { isLoading, error, getProductsForCategory, getCategoryById } =
    useHomepage();

  // ✅ normal 113 products for the homepage grid
  const products = getProductsForCategory(
    HOMEPAGE_CATEGORIES.POPULAR_GRID_CATEGORY_ID,
  );

  // 🔹 Get category 53 details (name and image)
  const category = getCategoryById(HOMEPAGE_CATEGORIES.POPULAR_CATEGORY_ID);

  // 🔹 open modal → fetch category 53 products
  const handleCategoryClick = useCallback(
    async (e) => {
      e.preventDefault();
      setSelectedCategory(category);
      setIsModalOpen(true);
      setModalLoading(true);

      try {
        const cacheKey = globalCache.key(
          "modal",
          "products",
          HOMEPAGE_CATEGORIES.POPULAR_CATEGORY_ID,
        );
        const fetched = await globalCache.fetch(cacheKey, () =>
          getProductsByCategoryId(HOMEPAGE_CATEGORIES.POPULAR_CATEGORY_ID),
        );
        setModalProducts(fetched || []);
      } catch {
        setModalProducts([]);
      } finally {
        setModalLoading(false);
      }
    },
    [category],
  );

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setModalProducts([]);
    setSelectedCategory(null);
  }, []);

  const Skeleton = ({ count = 6 }) => (
    <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white border border-gray-100 rounded-xl shadow-sm flex items-center p-1 animate-pulse"
        >
          <div className="w-14 h-14 sm:w-18 sm:h-18 md:w-22 md:h-22 rounded-lg bg-gray-200" />
          <div className="ml-2 sm:ml-3 flex-1">
            <div className="h-2.5 sm:h-3 w-3/4 bg-gray-200 mb-2 rounded" />
            <div className="h-2 sm:h-2.5 w-1/3 bg-orange-100 mb-2 rounded" />
            <div className="h-2.5 sm:h-3 w-1/2 bg-gray-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  );

  const getDiscount = (r, s) => {
    if (!r || !s) return null;
    const R = parseFloat(r);
    const S = parseFloat(s);
    if (R <= S) return null;
    return Math.round(((R - S) / R) * 100);
  };

  if (isLoading) return <Skeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center text-center border border-red-100 bg-red-50 p-4 sm:p-6 rounded-xl">
        <XCircle className="h-6 w-6 sm:h-8 sm:w-8 text-red-500 mb-2" />
        <p className="text-red-600 font-semibold text-sm sm:text-base">
          Failed to load popular games
        </p>
      </div>
    );
  }

  if (!products?.length) return null;

  return (
    <>
      {/* ✅ Grid with FIRST item as category card, rest as product cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        {/* 🎮 FIRST CARD: Category Card (opens modal) */}
        <div
          onClick={handleCategoryClick}
          style={{
            boxShadow:
              "0 1px 3px rgba(0,0,0,0.06), 0 6px 12px rgba(0,0,0,0.08)",
          }}
          className="group relative flex items-start bg-white border-3 border-transparent hover:border-accent-orange rounded-2xl rounded-tr-none hover:shadow-lg transition-all duration-300 overflow-hidden p-1 gap-2 sm:gap-3 cursor-pointer"
        >
          <div className="absolute top-0 right-0 bg-accent-orange text-white text-[10px] sm:text-xs md:text-sm font-bold rounded-bl-full px-2 sm:px-3 md:px-4 py-0.5 sm:py-1 z-10">
            <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
          </div>

          <div className="shrink-0 overflow-hidden rounded-lg">
            {category?.image?.src ? (
              <img
                src={category.image.src}
                alt={category.name}
                className="w-14 h-14 sm:w-18 sm:h-18 md:w-22 md:h-22 rounded-lg object-cover scale-[102%] transition-transform duration-300 group-hover:scale-110"
              />
            ) : (
              <div className="w-14 h-14 sm:w-18 sm:h-18 md:w-22 md:h-22 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                <Gamepad2 className="text-white w-6 h-6 sm:w-8 sm:h-8" />
              </div>
            )}
          </div>

          <div className="flex flex-col flex-1 justify-center pr-2 sm:pr-3">
            <p className="text-black text-[11px] sm:text-sm md:text-base font-semibold leading-tight line-clamp-2">
              {category?.name || "Popular Games"}
            </p>
            <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs text-orange-600 font-semibold mt-0.5">
              Click to explore
            </span>
            <p className="text-black text-[10px] sm:text-xs md:text-sm mt-0.5">
              Category
            </p>
          </div>
        </div>

        {/* 🎯 REST: Normal Product Cards (navigate to product page) */}
        {products.slice(0, 5).map((game, i) => {
          const discount = getDiscount(game.regular_price, game.sale_price);
          return (
            <Link
              key={game.id}
              to={game.slug ? `/product/${game.slug}` : "#"}
              style={{
                boxShadow:
                  "0 1px 3px rgba(0,0,0,0.06), 0 6px 12px rgba(0,0,0,0.08)",
              }}
              className="group relative flex items-start bg-white border-3 border-transparent hover:border-accent-orange rounded-2xl rounded-tr-none hover:shadow-lg transition-all duration-300 overflow-hidden p-1 gap-2 sm:gap-3"
            >
              <div className="absolute top-0 right-0 bg-accent-orange text-white text-[10px] sm:text-xs md:text-sm font-bold rounded-bl-full px-2 sm:px-3 md:px-4 py-0.5 sm:py-1 z-10">
                #{i + 1}
              </div>

              <div className="shrink-0 overflow-hidden rounded-lg">
                {game.images?.[0]?.src ? (
                  <img
                    src={game.images[0].src}
                    alt={game.name}
                    className="w-14 h-14 sm:w-18 sm:h-18 md:w-22 md:h-22 rounded-lg object-cover scale-[102%] transition-transform duration-300 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-14 h-14 sm:w-18 sm:h-18 md:w-22 md:h-22 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Gamepad2 className="text-gray-400 w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                )}
              </div>

              <div className="flex flex-col flex-1 justify-center pr-2 sm:pr-3">
                <p className="text-black text-[11px] sm:text-sm md:text-base font-semibold leading-tight line-clamp-2">
                  {game.name}
                </p>
                {discount ? (
                  <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs text-green-600 font-semibold mt-0.5">
                    🎉 {discount}% OFF
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs text-purple-400 font-medium mt-0.5">
                    Best Deal
                  </span>
                )}
                <p className="text-black text-[10px] sm:text-xs md:text-sm mt-0.5">
                  Games
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* 🪟 Modal shows category 53 products with actual category name and image */}
      {isModalOpen && selectedCategory && (
        <GameModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          category={selectedCategory}
          products={modalProducts}
          loading={modalLoading}
        />
      )}
    </>
  );
}
