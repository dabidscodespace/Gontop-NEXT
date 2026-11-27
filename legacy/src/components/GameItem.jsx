import { Link } from "react-router-dom";
import { Gamepad2, XCircle, ChevronRight, ChevronDown } from "lucide-react";

export default function GameItem({
  image,
  name,
  slug,
  onClick,
  showChevron = true,
  className = "",
  loading = false,
  stockStatus = "instock",
  stockQuantity = null,
}) {
  const isOut = stockStatus === "outofstock";
  const href = slug ? `/product/${slug}` : "#";

  const handleClick = (e) => {
    if (loading || isOut) {
      e.preventDefault();
      return;
    }

    if (onClick && e.button === 0) onClick();
  };

  const baseShadow = `
    0 6px 12px rgba(0,0,0,0.18),
    inset 0 -4px 0 0 #f96000
  `;

  const hoverShadow = `
    0 8px 16px rgba(0,0,0,0.24),
    inset 0 0 0 3px #f96000
  `;

  /* -------- Loading skeleton -------- */
  if (loading) {
    return (
      <div
        className={`w-full rounded-2xl bg-white p-3 animate-pulse ${className}`}
        style={{ boxShadow: baseShadow }}
      >
        <div className="aspect-square w-full rounded-xl bg-gray-200" />
        <div className="mx-auto mt-3 h-4 w-3/4 rounded bg-gray-300" />
      </div>
    );
  }

  /* -------- Category card (modal opener) -------- */
  if (showChevron) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`group relative flex w-full flex-col overflow-visible rounded-2xl bg-white p-3 text-left transition-all duration-300 cursor-pointer ${className}`}
        style={{ boxShadow: baseShadow }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = hoverShadow;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = baseShadow;
        }}
      >
        {/* Chevron badge */}
        <div className="absolute -top-2 -right-2 z-20 pointer-events-none">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-orange shadow-lg ring-2 ring-white transition-transform duration-300 group-hover:scale-110 group-hover:rotate-180">
            <ChevronDown className="h-4 w-4 text-white" />
          </div>
        </div>

        {/* Inner content */}
        <div className="overflow-hidden rounded-2xl">
          {/* Image */}
          <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-gray-100">
            {image ? (
              <img
                src={image}
                alt={name}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Gamepad2 className="h-10 w-10 text-gray-400" />
              </div>
            )}

            {/* subtle hover overlay */}
            <div className="absolute inset-0 rounded-xl bg-accent-orange/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          </div>

          {/* Title */}
          <div className="mt-3 flex h-8 items-center justify-center text-center">
            <p className="line-clamp-2 text-xs font-semibold text-black transition-colors duration-300 group-hover:text-accent-orange md:text-sm">
              {name}
            </p>
          </div>
        </div>

        {/* subtle highlight ring */}
        <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-orange-200 transition-all duration-300 group-hover:ring-2 group-hover:ring-accent-orange/50" />
      </button>
    );
  }

  /* -------- Main product card -------- */
  return (
    <Link
      to={href}
      onClick={handleClick}
      aria-disabled={isOut}
      className={`
        group relative block w-full overflow-hidden rounded-2xl bg-white p-3
        transition-all duration-300
        ${isOut ? "cursor-not-allowed" : "cursor-pointer"}
        ${className}
      `}
      style={{ boxShadow: baseShadow }}
      onMouseEnter={(e) => {
        if (!isOut) e.currentTarget.style.boxShadow = hoverShadow;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = baseShadow;
      }}
    >
      {/* Stock badge */}
      {!isOut && stockQuantity !== null && (
        <div className="absolute left-3 top-3 z-10 rounded border border-green-500 bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-600">
          ×{stockQuantity}
        </div>
      )}

      {/* Out of stock overlay */}
      {isOut && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/90">
          <XCircle className="mb-1 h-6 w-6 animate-pulse text-red-500" />
          <span className="text-xs font-semibold uppercase tracking-widest text-red-600">
            Stock Out
          </span>
        </div>
      )}

      {/* Image block */}
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-gray-100">
        {image ? (
          <img
            src={image}
            alt={name}
            className={`h-full w-full object-cover transition-transform duration-300 ${
              isOut ? "grayscale opacity-75" : "group-hover:scale-105"
            }`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Gamepad2 className="h-10 w-10 text-gray-400" />
          </div>
        )}
      </div>

      {/* Title */}
      <div className="mt-3 flex h-8 items-center justify-center text-center">
        <p
          className={`text-xs font-semibold transition-colors duration-300 md:text-sm ${
            isOut
              ? "text-gray-400"
              : "text-black group-hover:text-accent-orange"
          }`}
        >
          {name}
        </p>
      </div>
    </Link>
  );
}
