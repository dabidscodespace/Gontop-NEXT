import PackageCard from "./PackageCard";

export default function PackageSelectionSection({
  variations,
  product,
  selectedPackages,
  totalItems,
  subtotal,
  onTogglePackage,
  onIncreaseQuantity,
  onDecreaseQuantity,
  onRemovePackage,
  onClearAll,
  unavailableVariations = [],
  regionRestrictedVariations = [],
}) {
  const hasSelectedPackages = Object.keys(selectedPackages).length > 0;

  const orderedVariations = [...(variations || [])].sort((a, b) => {
    const aOrder =
      typeof a.menu_order === "number" ? a.menu_order : Number.MAX_SAFE_INTEGER;
    const bOrder =
      typeof b.menu_order === "number" ? b.menu_order : Number.MAX_SAFE_INTEGER;
    return aOrder - bOrder;
  });

  return (
    <div className="border-border space-y-4 overflow-hidden rounded-xl border bg-white p-3 lg:p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10">
            <div className="absolute bottom-0 left-1 h-8 w-8 rounded-lg bg-orange-300" />
            <div className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 text-sm font-bold text-white shadow-md">
              2
            </div>
          </div>
          <h3 className="text-sm font-bold text-gray-800">Select Package(s)</h3>
        </div>

        {hasSelectedPackages && (
          <div className="rounded-full bg-[#FE642C]/10 px-3 py-1 text-xs font-semibold text-[#FE642C]">
            {totalItems} {totalItems === 1 ? "item" : "items"} selected
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {orderedVariations.map((v) => {
          const pkg = selectedPackages[v.id];
          const isSelected = Boolean(pkg);
          const qty = pkg?.quantity || 0;

          const isInUnavailable = unavailableVariations.includes(v.id);
          const isRegionRestricted = regionRestrictedVariations.includes(v.id);

          const isAlreadyPurchased = isInUnavailable;
          const unavailableReason = isRegionRestricted
            ? "region_restricted"
            : null;

          return (
            <PackageCard
              key={v.id}
              variation={v}
              product={product}
              isSelected={isSelected}
              quantity={qty}
              onToggle={() => onTogglePackage(v)}
              onIncrease={() => onIncreaseQuantity(v.id)}
              onDecrease={() => onDecreaseQuantity(v.id)}
              isAlreadyPurchased={isAlreadyPurchased}
              unavailableReason={unavailableReason}
            />
          );
        })}
      </div>

      {/* {hasSelectedPackages && (
        <SelectedPackagesSummary
          selectedPackages={selectedPackages}
          product={product}
          subtotal={subtotal}
          onRemove={onRemovePackage}
          onClearAll={onClearAll}
        />
      )} */}
    </div>
  );
}
