// src/components/ProductSection.jsx
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { useHomepage } from "../context/HomepageContext";
import GameItem from "./GameItem";
import GameModal from "./GameModal"; // ✅ Add this import
import SkeletonGrid from "./SkeletonGrid";
import Title from "./Title";

const INITIAL_DISPLAY = 12;

export default function ProductSection({
  categoryId,
  extraCategoryIds = [],
  title,
  titleColor,
  desColor,
  gif,
  description,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null); // ✅ Add this
  const [isModalOpen, setIsModalOpen] = useState(false);          // ✅ Add this

  const { isLoading, error, getProductsForCategory, getCategoriesByIds } = useHomepage();

  const products = getProductsForCategory(categoryId);
  const extraCategories = getCategoriesByIds(extraCategoryIds);

  const combinedItems = [
    ...extraCategories.map((cat) => ({ ...cat, _type: "category" })),
    ...products.map((prod) => ({ ...prod, _type: "product" })),
  ];

  const displayedItems = isExpanded ? combinedItems : combinedItems.slice(0, INITIAL_DISPLAY);
  const hasMore = combinedItems.length > INITIAL_DISPLAY;

  // ✅ Add these handlers
  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedCategory(null);
  };

  if (!isLoading && combinedItems.length === 0 && !error) {
    return null;
  }

  return (
    <div className="py-6 lg:py-8">
      <Title
        name={title}
        desc={description}
        className="text-start"
        size="text-2xl"
        gif={gif}
        color={titleColor}
      />

      {error ? (
        <p className="py-8 text-center text-red-500">Failed to load products</p>
      ) : isLoading ? (
        <SkeletonGrid count={INITIAL_DISPLAY} variant="light" />
      ) : (
        <>
          <div className="grid grid-cols-3 items-stretch gap-3 md:gap-6 md:grid-cols-4 lg:grid-cols-5">
            {displayedItems.map((item) =>
              item._type === "category" ? (
                <GameItem
                  key={`cat-${item.id}`}
                  image={item.image?.src}
                  name={item.name}
                  textBg="bg-accent-orange"
                  showChevron={true}
                  className="cursor-pointer text-white"
                  onClick={() => handleCategoryClick(item)} // ✅ Add this
                />
              ) : (
                <GameItem
                  key={`prod-${item.id}`}
                  image={item?.images?.[0]?.src}
                  name={item.name}
                  slug={item.slug}
                  stockStatus={item.stock_status}
                  stockQuantity={item.stock_quantity}
                  productType={item.type}
                  textBg="bg-accent-orange"
                  showChevron={false}
                  className="text-white"
                />
              )
            )}
          </div>

          {hasMore && (
            <div className="mt-10 flex justify-center">
              <button
                onClick={() => setIsExpanded((prev) => !prev)}
                className="group border-border bg-accent-primary hover:bg-accent-primary/90 flex items-center gap-2 rounded-xl border px-6 py-3 text-sm font-semibold text-white transition-colors"
              >
                {isExpanded ? (
                  <>
                    View Less
                    <ChevronUp className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    View More
                    <ChevronDown className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}

      {/* ✅ Add Modal here */}
      <GameModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        category={selectedCategory}
      />
    </div>
  );
}