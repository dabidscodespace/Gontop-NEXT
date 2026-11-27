// src/hooks/usePackageSelection.js
import { useCallback, useState } from "react";
import { computeCouponDiscount } from "../api";

/**
 * Extract price from variation object
 */
const getPrice = (variation) => {
  const price =
    variation?.price ??
    variation?.sale_price ??
    variation?.regular_price ??
    variation?.display_price ??
    0;
  return parseFloat(price) || 0;
};

export const usePackageSelection = (onSelect) => {
  const [selectedPackages, setSelectedPackages] = useState({});
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  const calculateSubtotal = useCallback(() => {
    return Object.values(selectedPackages).reduce((total, pkg) => {
      const price = getPrice(pkg.variation);
      return total + price * pkg.quantity;
    }, 0);
  }, [selectedPackages]);

  const calculateDiscount = useCallback(() => {
    if (!appliedCoupon) return 0;
    return computeCouponDiscount(appliedCoupon, calculateSubtotal());
  }, [appliedCoupon, calculateSubtotal]);

  const calculateTotal = useCallback(() => {
    return Math.max(0, calculateSubtotal() - calculateDiscount());
  }, [calculateSubtotal, calculateDiscount]);

  const getTotalItems = useCallback(() => {
    return Object.values(selectedPackages).reduce((total, pkg) => {
      return total + pkg.quantity;
    }, 0);
  }, [selectedPackages]);

  const getSelectedVariationIds = useCallback(() => {
    return Object.values(selectedPackages).map((pkg) => pkg.variation.id);
  }, [selectedPackages]);

  const handleTogglePackage = useCallback(
    (v) => {
      const price = getPrice(v);

      setSelectedPackages((prev) => {
        const existing = prev[v.id];

        if (existing) {
          const { [v.id]: removed, ...rest } = prev;
          onSelect?.(Object.values(rest));
          return rest;
        }

        const variationWithPrice = {
          ...v,
          price: price,
        };

        const updated = {
          ...prev,
          [v.id]: {
            variation: variationWithPrice,
            quantity: 1,
          },
        };

        onSelect?.(Object.values(updated));
        return updated;
      });
    },
    [onSelect],
  );

  const handleIncreaseQuantity = useCallback((id) => {
    setSelectedPackages((prev) => ({
      ...prev,
      [id]: { ...prev[id], quantity: prev[id].quantity + 1 },
    }));
  }, []);

  const handleDecreaseQuantity = useCallback((id) => {
    setSelectedPackages((prev) => {
      const current = prev[id];
      if (current.quantity <= 1) {
        const { [id]: removed, ...rest } = prev;
        return rest;
      }
      return {
        ...prev,
        [id]: { ...current, quantity: current.quantity - 1 },
      };
    });
  }, []);

  const handleRemovePackage = useCallback((id) => {
    setSelectedPackages((prev) => {
      const { [id]: removed, ...rest } = prev;
      return rest;
    });
  }, []);

  const handleClearAll = useCallback(() => {
    setSelectedPackages({});
    setAppliedCoupon(null);
  }, []);

  const handleCouponApply = useCallback((coupon) => {
    setAppliedCoupon(coupon);
  }, []);

  const handleCouponRemove = useCallback(() => {
    setAppliedCoupon(null);
  }, []);

  // 👇 ADD THIS: Remove packages that become restricted/unavailable
  const removeRestrictedPackages = useCallback(
    (restrictedVariationIds) => {
      if (!restrictedVariationIds?.length) return;

      setSelectedPackages((prev) => {
        const newPackages = {};
        let hasChanges = false;

        Object.entries(prev).forEach(([key, pkg]) => {
          const variationId = pkg?.variation?.id;
          if (!restrictedVariationIds.includes(variationId)) {
            newPackages[key] = pkg;
          } else {
            hasChanges = true;
            console.log(
              `[usePackageSelection] Removing restricted package: ${variationId}`,
            );
          }
        });

        // Only update state and call onSelect if something changed
        if (hasChanges) {
          onSelect?.(Object.values(newPackages));
          return newPackages;
        }

        return prev;
      });
    },
    [onSelect],
  );

  return {
    selectedPackages,
    appliedCoupon,
    subtotal: calculateSubtotal(),
    discount: calculateDiscount(),
    total: calculateTotal(),
    totalItems: getTotalItems(),
    selectedVariationIds: getSelectedVariationIds(),
    hasSelectedPackages: Object.keys(selectedPackages).length > 0,
    handleTogglePackage,
    handleIncreaseQuantity,
    handleDecreaseQuantity,
    handleRemovePackage,
    handleClearAll,
    handleCouponApply,
    handleCouponRemove,
    removeRestrictedPackages, // 👈 Add this to return
  };
};
