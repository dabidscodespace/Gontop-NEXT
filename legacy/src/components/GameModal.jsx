// GameModal.jsx - Optimized
import { Globe } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { getProductsByCategoryId } from "../api";
import GameItem from "./GameItem";

const DEFAULT_SKELETON_COUNT = 8;

const GameModal = ({ isOpen, onClose, category }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [animating, setAnimating] = useState(false);

  const lastFetchedCategoryId = useRef(null);

  const skeletonCount = category?.count || DEFAULT_SKELETON_COUNT;

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !category?.id) return;

    setAnimating(true);

    if (lastFetchedCategoryId.current === category.id && products.length > 0) {
      return;
    }

    if (lastFetchedCategoryId.current !== category.id) {
      setProducts([]);
      setError(null);
    }

    let isMounted = true;
    setLoading(true);

    (async () => {
      try {
        const data = await getProductsByCategoryId(category.id);

        if (!isMounted) return;

        setProducts(data);
        setError(data.length === 0 ? "No products available" : null);
        lastFetchedCategoryId.current = category.id;
      } catch {
        if (isMounted) {
          setError("Failed to load products");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [isOpen, category?.id]);

  useEffect(() => {
    if (!isOpen) {
      setAnimating(false);
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setAnimating(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  const handleProductClick = useCallback(() => {
    handleClose();
  }, [handleClose]);

  if (!isOpen) return null;

  const showSkeleton = loading && products.length === 0;
  const showError = error && products.length === 0;
  const showProducts = products.length > 0;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        onClick={handleClose}
        className={`absolute inset-0 transition-opacity duration-300 ease-out ${
          animating ? "opacity-100" : "opacity-0"
        } bg-black/70 backdrop-blur-sm`}
      />

      {/* Modal Container */}
      <div
        className={`
          absolute top-1/2 left-1/2 mx-auto flex
          max-h-[75vh] w-[92%] max-w-3xl flex-col
          rounded-2xl shadow-2xl
          transition-all duration-300 ease-out
          lg:max-h-[88vh]
          bg-primary
          border border-white/5
          ${
            animating
              ? "-translate-x-1/2 -translate-y-1/2 opacity-100"
              : "-translate-x-1/2 translate-y-[150%] opacity-0"
          }
        `}
      >
        {/* Top accent bar */}
        <div className="h-1 w-full rounded-t-2xl bg-accent-orange" />

        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-white/10" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3">
          {/* Left: image + title */}
          <div className="flex min-w-0 items-center gap-3">
            {category?.image?.src ? (
              <div
                className="
                  h-11 w-11 shrink-0 overflow-hidden rounded-xl
                  bg-secondary
                  ring-1 ring-white/10
                  sm:h-13 sm:w-13 
                "
              >
                <img
                  src={category.image.src}
                  alt={category.name}
                  className="h-full w-full object-contain p-1 rounded-xl"
                  loading="lazy"
                />
              </div>
            ) : (
              /* Fallback icon box when no image */
              <div
                className="
                  flex h-11 w-11 shrink-0 items-center justify-center
                  rounded-xl bg-secondary
                  ring-1 ring-white/10
                "
              >
                <Globe size={20} className="text-accent-orange" />
              </div>
            )}

            <div className="min-w-0">
              <h3 className="truncate text-sm font-black tracking-wide text-white uppercase sm:text-base">
                {category?.name}
              </h3>
              <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-white/40">
                <Globe size={11} />
                Select your region
              </p>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={handleClose}
            className="
              ml-3 shrink-0 cursor-pointer rounded-full p-2
              text-white/50
              transition-all duration-200
              hover:rotate-90 hover:bg-white/8 hover:text-white
            "
            aria-label="Close"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Divider */}
        <div className="mx-5 h-px bg-white/5" />

        {/* Scrollable Content */}
        <div
          className="
            scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent
            flex-1 overflow-y-auto px-4 py-4
          "
        >
          {/* Skeleton grid */}
          {showSkeleton && (
            <div className="grid grid-cols-2 gap-3 xs:grid-cols-3 md:grid-cols-4">
              {Array.from({ length: skeletonCount }).map((_, i) => (
                <GameItem key={i} loading showChevron={false} />
              ))}
            </div>
          )}

          {/* Error state */}
          {showError && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              {/* Orange warning icon */}
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-orange/10">
                <svg
                  className="h-6 w-6 text-accent-orange"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-white/50">{error}</p>
            </div>
          )}

          {/* Products grid */}
          {showProducts && (
            <div className="grid grid-cols-2 place-items-center gap-3 xs:grid-cols-3 md:grid-cols-4">
              {products.map((p) => (
                <GameItem
                  key={p.id}
                  image={p.images?.[0]?.src}
                  name={p.name}
                  slug={p.slug}
                  showChevron={false}
                  textBg="bg-secondary"
                  onClick={handleProductClick}
                  stockStatus={p.stock_status}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {showProducts && !loading && (
          <div
            className="
              flex items-center justify-center gap-2
              rounded-b-2xl border-t border-white/5
              bg-secondary/40 py-2.5
            "
          >
            <img
              src="/logo.png"
              alt=""
              className="h-6 opacity-70"
              loading="lazy"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default GameModal;
