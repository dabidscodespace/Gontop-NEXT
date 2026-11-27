import { useState } from "react";
import { parseName } from "../../utils/packageUtils";

function DescriptionModal({ isOpen, onClose, title, bonus, description }) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-orange-500 to-orange-400 px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-white sm:text-base">
                {title}
              </h3>
              {bonus && (
                <p className="mt-0.5 text-xs font-medium text-orange-100">
                  {bonus}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-white/20 text-white transition-all hover:bg-white/30 active:scale-95"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-4 py-4">
          <div
            className="prose prose-sm max-w-none text-sm leading-relaxed text-gray-600"
            dangerouslySetInnerHTML={{ __html: description }}
          />
        </div>

        <div className="border-t border-gray-100 px-4 py-3">
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white transition-all hover:bg-orange-600 active:scale-95"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PackageCard({
  variation,
  product,
  isSelected,
  quantity,
  onToggle,
  onIncrease,
  onDecrease,
  isAlreadyPurchased = false,
  unavailableReason = null,
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { main, bonus } = parseName(
    variation.name || variation.attributes?.[0]?.option || "Package"
  );

  const hasDescription = Boolean(variation.description);
  const isOutOfStock = variation.stock_status === "outofstock";
  const stockQuantity = variation.stock_quantity;
  const isLowStock =
    stockQuantity !== null && stockQuantity > 0 && stockQuantity <= 5;

  const isUnavailable = isOutOfStock || isAlreadyPurchased || unavailableReason;

  const handleToggle = () => {
    if (!isUnavailable) onToggle();
  };

  const handleInfoClick = (e) => {
    e.stopPropagation();
    setIsModalOpen(true);
  };

  const getUnavailableMessage = () => {
    if (isOutOfStock) return "Out of Stock";
    if (unavailableReason === "region_restricted") return "Not Available";
    if (isAlreadyPurchased) return "Already Purchased";
    return "Unavailable";
  };

  const formatPrice = (price) => {
    const numPrice = Math.round(Number(price || 0));
    return numPrice.toLocaleString("en-IN");
  };

  const getStatusBadge = () => {
    if (isOutOfStock) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 sm:text-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
          Out of Stock
        </span>
      );
    }
    if (isAlreadyPurchased) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600 sm:text-xs">
          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          Purchased
        </span>
      );
    }
    if (isLowStock) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-orange-600 sm:text-xs">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-500" />
          {stockQuantity} left
        </span>
      );
    }
    if (stockQuantity !== null) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600 sm:text-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          In Stock
        </span>
      );
    }
    return null;
  };

  return (
    <>
      {hasDescription && (
        <DescriptionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={main}
          bonus={bonus}
          description={variation.description}
        />
      )}

      {/* Wrapper with overflow-visible for the sticking-out button */}
      <div className="relative">
        {/* Info Button - Sticking out top-right, vertically centered on the border */}
        {hasDescription && (
          <button
            onClick={handleInfoClick}
            className={`
              absolute -right-2 -top-2 z-30 flex h-6 w-6 items-center justify-center 
              rounded-full border-2 shadow-md transition-all 
              hover:scale-110 active:scale-95 sm:h-7 sm:w-7
              ${
                isUnavailable
                  ? "border-gray-300 bg-gray-100 text-gray-400"
                  : "border-white bg-orange-500 text-white hover:bg-orange-600"
              }
            `}
            title="View description"
          >
            <svg
              className="h-3 w-3 sm:h-3.5 sm:w-3.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}

        <div
          onClick={handleToggle}
          className={`
            group relative flex h-full flex-col overflow-hidden rounded-xl border-2 
            transition-all duration-300 ease-out
            ${
              isUnavailable
                ? "cursor-not-allowed border-gray-200 bg-gray-50"
                : isSelected
                  ? "cursor-pointer border-orange-500 bg-gradient-to-br from-orange-50 to-white shadow-lg shadow-orange-500/10"
                  : "cursor-pointer border-gray-200 bg-white hover:border-orange-300 hover:shadow-md"
            }
          `}
        >
          {/* Selection Indicator */}
          {isSelected && !isUnavailable && (
            <div className="absolute -right-px -top-px z-10">
              <div className="flex h-6 w-6 items-center justify-center rounded-bl-lg bg-orange-500 sm:h-7 sm:w-7">
                <svg
                  className="h-3 w-3 text-white sm:h-4 sm:w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
          )}

          {/* Unavailable Overlay */}
          {isUnavailable && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60 backdrop-blur-[1px]">
              <div className="rounded-full bg-gray-800/80 px-3 py-1.5 sm:px-4 sm:py-2">
                <p className="text-[10px] font-semibold text-white sm:text-xs">
                  {getUnavailableMessage()}
                </p>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="flex flex-1 gap-2 p-2.5 sm:gap-3 sm:p-3 md:p-4">
            {/* Image */}
            <div
              className={`
                relative flex aspect-square w-10 shrink-0 items-center justify-center 
                overflow-hidden rounded-lg bg-gray-100 sm:w-12 rounded-xl md:w-14
                ${isUnavailable ? "opacity-50 grayscale" : ""}
              `}
            >
              <img
                src={variation.image?.src || product.images?.[0]?.src}
                alt={main}
                className="h-full w-full rounded-xl object-contain p-1 transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
                decoding="async"
              />
            </div>

            {/* Details */}
            <div className="flex min-w-0 flex-1 flex-col justify-between">
              <div>
                <h3
                  className={`
                    line-clamp-2 text-xs font-semibold leading-tight
                    sm:text-sm md:text-base
                    ${isUnavailable ? "text-gray-400" : "text-gray-800"}
                  `}
                >
                  {main}
                </h3>
                {bonus && (
                  <p
                    className={`
                      mt-0.5 line-clamp-1 text-[10px] font-medium
                      sm:text-xs
                      ${isUnavailable ? "text-gray-400" : "text-orange-500"}
                    `}
                  >
                    {bonus}
                  </p>
                )}
              </div>

              {/* Status Badge */}
              <div className="mt-1.5 sm:mt-2">{getStatusBadge()}</div>
            </div>
          </div>

          {/* Footer / Price Section */}
          <div
            className={`
              border-t px-2 py-2 sm:px-3 sm:py-2.5 md:px-4
              ${
                isSelected && !isUnavailable
                  ? "border-orange-100 bg-orange-50/50"
                  : "border-gray-100 bg-gray-50/50"
              }
            `}
          >
            {isSelected && !isUnavailable ? (
              <div className="flex items-center justify-between gap-1 sm:gap-2">
                {/* Quantity Controls */}
                <div className="flex items-center gap-0.5 sm:gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDecrease();
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded-md bg-white text-gray-600 shadow-sm transition-all hover:bg-gray-100 active:scale-95 sm:h-8 sm:w-8 sm:rounded-lg"
                  >
                    {quantity === 1 ? (
                      <svg
                        className="h-3 w-3 text-red-500 sm:h-4 sm:w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    ) : (
                      <span className="text-sm font-medium sm:text-base">
                        −
                      </span>
                    )}
                  </button>

                  <span className="min-w-[1.5rem] text-center text-xs font-bold text-gray-800 sm:min-w-[2rem] sm:text-base">
                    {quantity}
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onIncrease();
                    }}
                    disabled={
                      stockQuantity !== null && quantity >= stockQuantity
                    }
                    className={`
                      flex h-6 w-6 items-center justify-center rounded-md text-sm font-medium shadow-sm 
                      transition-all active:scale-95 sm:h-8 sm:w-8 sm:rounded-lg sm:text-base
                      ${
                        stockQuantity !== null && quantity >= stockQuantity
                          ? "cursor-not-allowed bg-gray-100 text-gray-400"
                          : "bg-orange-500 text-white hover:bg-orange-600"
                      }
                    `}
                  >
                    +
                  </button>
                </div>

                {/* Total Price */}
                <div className="min-w-0 flex-shrink-0 text-right">
                  <p className="truncate text-xs font-bold text-orange-600 sm:text-sm md:text-base">
                    <span className="text-[10px] sm:text-xs">৳</span>{" "}
                    {formatPrice(Number(variation.price || 0) * quantity)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                {/* Price */}
                <div className="flex min-w-0 flex-1 items-baseline gap-1 sm:gap-1.5">
                  <p
                    className={`
                      truncate text-xs font-bold sm:text-sm md:text-base
                      ${isUnavailable ? "text-gray-400" : "text-gray-800"}
                    `}
                  >
                    <span className="text-[10px] sm:text-xs">৳</span>{" "}
                    {formatPrice(variation.price)}
                  </p>
                  {variation.oldPrice && !isUnavailable && (
                    <p className="flex-shrink-0 text-[9px] text-gray-400 line-through sm:text-xs">
                      ৳{formatPrice(variation.oldPrice)}
                    </p>
                  )}
                </div>

                {/* Add Button */}
                {!isUnavailable && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggle();
                    }}
                    className="flex flex-shrink-0 items-center gap-0.5 rounded-md bg-orange-500 px-2 py-1 text-[10px] font-semibold text-white shadow-sm transition-all hover:bg-orange-600 active:scale-95 sm:gap-1 sm:rounded-lg sm:px-3 sm:py-1.5 sm:text-xs"
                  >
                    <svg
                      className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    Add
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}