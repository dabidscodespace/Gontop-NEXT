/**
 * Reusable Skeleton grid placeholder
 * @param {number} count        Number of cards to render (default 12)
 * @param {'light'|'dark'} variant Color theme for different sections
 */
export default function SkeletonGrid({ count = 12, variant = "light" }) {
  const array = Array.from({ length: count });

  const base =
    variant === "light"
      ? "bg-white border border-gray-200"
      : "bg-secondary border border-white/10";

  const inner = variant === "light" ? "bg-gray-200" : "bg-white/10";

  const line = variant === "light" ? "bg-gray-100" : "bg-white/5";

  return (
    <div className="grid grid-cols-3 gap-2 md:grid-cols-4 lg:grid-cols-6 lg:gap-4">
      {array.map((_, i) => (
        <div key={i} className={`animate-pulse rounded-2xl p-3 ${base}`}>
          <div className={`aspect-square rounded-xl ${inner}`} />
          <div className={`mx-auto mt-3 h-4 w-3/4 rounded ${inner}`} />
          <div className={`mx-auto mt-2 h-3 w-1/2 rounded ${line}`} />
        </div>
      ))}
    </div>
  );
}