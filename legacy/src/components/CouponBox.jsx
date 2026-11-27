// components/CouponBox.jsx
import { useState } from "react";
import { toast } from "react-toastify";
import { computeCouponDiscount, getCouponByCode } from "../api";
import StepBadge from "./PackageSelection/StepBadge";

const CouponBox = ({
  subtotal,
  productId,
  selectedVariationIds = [],
  onCouponApply,
  onCouponRemove,
  appliedCoupon,
}) => {
  const [couponCode, setCouponCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const discount = appliedCoupon
    ? computeCouponDiscount(appliedCoupon, subtotal)
    : 0;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setError("Please enter a coupon code");
      return;
    }

    if (subtotal <= 0) {
      setError("Please select a package first");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const coupon = await getCouponByCode(couponCode.trim());

      if (!coupon) {
        setError("Invalid or expired coupon code");
        return;
      }

      // Check minimum spend
      if (
        coupon.minimum_amount &&
        parseFloat(coupon.minimum_amount) > subtotal
      ) {
        setError(
          `Minimum spend of ৳${Math.round(
            parseFloat(coupon.minimum_amount),
          )} required`,
        );
        return;
      }

      // Check maximum spend
      if (
        coupon.maximum_amount &&
        parseFloat(coupon.maximum_amount) > 0 &&
        parseFloat(coupon.maximum_amount) < subtotal
      ) {
        setError(
          `Maximum spend of ৳${Math.round(
            parseFloat(coupon.maximum_amount),
          )} exceeded`,
        );
        return;
      }

      // Check usage limit
      if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
        setError("This coupon has reached its usage limit");
        return;
      }

      // Check product restrictions
      if (coupon.product_ids && coupon.product_ids.length > 0) {
        const hasValidProduct =
          selectedVariationIds.some((id) => coupon.product_ids.includes(id)) ||
          coupon.product_ids.includes(productId);

        if (!hasValidProduct) {
          setError("This coupon is not valid for selected products");
          return;
        }
      }

      // Check excluded products
      if (
        coupon.excluded_product_ids &&
        coupon.excluded_product_ids.length > 0
      ) {
        const isExcluded =
          selectedVariationIds.some((id) =>
            coupon.excluded_product_ids.includes(id),
          ) || coupon.excluded_product_ids.includes(productId);

        if (isExcluded) {
          setError("This coupon cannot be used with selected products");
          return;
        }
      }

      // Success
      const discountAmount = computeCouponDiscount(coupon, subtotal);
      onCouponApply({
        ...coupon,
        discountAmount,
      });
      setError("");
      setCouponCode("");
      toast.success(`Coupon "${coupon.code}" applied successfully!`);
    } catch (err) {
      console.error("Coupon error:", err);
      setError("Failed to apply coupon. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    onCouponRemove();
    setCouponCode("");
    setError("");
    toast.info("Coupon removed");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleApplyCoupon();
    }
  };

  return (
    <div className="space-y-4 overflow-hidden rounded-xl border border-gray-200 bg-white p-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        <StepBadge
          svg={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58s1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41s-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z" />
            </svg>
          }
        />
        <h3 className="text-sm font-bold text-gray-700 uppercase">
          Have a Coupon?
        </h3>
      </div>

      {appliedCoupon ? (
        // Applied Coupon Display
        <div className="rounded-lg border border-green-200 bg-green-50 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-green-600"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-green-700 uppercase">
                  {appliedCoupon.code}
                </p>
                <p className="text-xs text-green-600">
                  {appliedCoupon.discount_type === "percent"
                    ? `${appliedCoupon.amount}% off`
                    : `৳${Math.round(parseFloat(appliedCoupon.amount))} off`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-green-700">
                -৳ {Math.round(discount)}
              </span>
              <button
                onClick={handleRemoveCoupon}
                className="p-1 text-gray-400 transition-colors hover:text-red-500"
                aria-label="Remove coupon"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>
        </div>
      ) : (
        // Coupon Input Form
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => {
                setCouponCode(e.target.value.toUpperCase());
                setError("");
              }}
              onKeyPress={handleKeyPress}
              placeholder="Enter coupon code"
              className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 uppercase transition-all placeholder:text-gray-400 focus:border-[#FA3333] focus:ring-1 focus:ring-[#FA3333]/20 focus:outline-none"
              disabled={loading}
            />
            <button
              onClick={handleApplyCoupon}
              disabled={loading || !couponCode.trim()}
              className="flex min-w-22.5 items-center justify-center gap-2 rounded-lg bg-[#FA3333] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#FA3333]/90 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {loading ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span className="hidden sm:inline">Checking</span>
                </>
              ) : (
                "Apply"
              )}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <p className="flex items-center gap-1 text-xs font-medium text-red-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default CouponBox;
