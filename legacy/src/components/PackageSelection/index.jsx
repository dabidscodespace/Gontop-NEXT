import { useCallback, useEffect, useRef, useState } from "react";
import { computeCouponDiscount, getWalletBalance } from "../../api";
import { useShop } from "../../context/ShopContext";
import { usePackageSelection } from "../../hooks/usePackageSelection";
import ProductBanner from "../ProductBanner";
import DescriptionSection from "./DescriptionSection";
import GameIdSection from "./GameIdSection";
import PackageSelectionSection from "./PackageSelectionSection";
import PaymentSection from "./PaymentSection";

export default function PackageSelection({ product, variations, onSelect }) {
  const { isAuthenticated, user } = useShop();

  const [activeTab, setActiveTab] = useState("order");
  const [selectedPayment, setSelectedPayment] = useState("bkash");
  const [gameData, setGameData] = useState({
    hasFields: false,
    fields: {},
    isComplete: false,
    isVerified: false,
    unavailableVariations: [],
    regionRestrictedVariations: [],
  });
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loadingWallet, setLoadingWallet] = useState(false);

  const lastRestrictionsRef = useRef("");

  const {
    selectedPackages,
    subtotal,
    totalItems,
    hasSelectedPackages,
    handleTogglePackage,
    handleIncreaseQuantity,
    handleDecreaseQuantity,
    handleRemovePackage,
    handleClearAll,
    removeRestrictedPackages,
  } = usePackageSelection(onSelect);

  // Wallet
  useEffect(() => {
    async function fetchWallet() {
      if (!isAuthenticated || !user?.email) {
        setWalletBalance(0);
        return;
      }
      setLoadingWallet(true);
      try {
        const data = await getWalletBalance(user.email);
        setWalletBalance(data?.balance || 0);
      } catch (error) {
        console.error("[PackageSelection] Wallet fetch error:", error);
        setWalletBalance(0);
      } finally {
        setLoadingWallet(false);
      }
    }
    fetchWallet();
  }, [isAuthenticated, user?.email]);

  // Restriction Auto-Removal
  useEffect(() => {
    const unavailableIds = gameData?.unavailableVariations || [];
    const regionRestrictedIds = gameData?.regionRestrictedVariations || [];
    const allRestrictedIds = [...unavailableIds, ...regionRestrictedIds];
    const restrictionKey = allRestrictedIds.sort().join(",");

    if (allRestrictedIds.length === 0) {
      lastRestrictionsRef.current = "";
      return;
    }

    if (lastRestrictionsRef.current !== restrictionKey) {
      lastRestrictionsRef.current = restrictionKey;
      removeRestrictedPackages(allRestrictedIds);
    }
  }, [
    gameData?.unavailableVariations,
    gameData?.regionRestrictedVariations,
    removeRestrictedPackages,
  ]);

  useEffect(() => {
    if (!gameData?.isComplete && !gameData?.isVerified) {
      lastRestrictionsRef.current = "";
    }
  }, [gameData?.isComplete, gameData?.isVerified]);

  // Totals
  const discount = appliedCoupon
    ? computeCouponDiscount(appliedCoupon, subtotal)
    : 0;
  const total = Math.max(0, subtotal - discount);

  // Coupon
  const handleCouponApply = (coupon) => setAppliedCoupon(coupon);
  const handleCouponRemove = () => setAppliedCoupon(null);

  const handleClearAllWithCoupon = useCallback(() => {
    handleClearAll();
    setAppliedCoupon(null);
  }, [handleClearAll]);

  // Game Data Updates
  const handleGameDataChange = useCallback((data) => {
    const flat = Object.fromEntries(
      Object.entries(data.formData || {}).map(([k, v]) => [k, v?.value]),
    );
    setGameData({
      ...data,
      fields: flat,
      fieldLabels: data.fieldLabels || {},
      unavailableVariations: data.unavailableVariations || [],
      regionRestrictedVariations: data.regionRestrictedVariations || [],
    });
  }, []);

  // Verification
  const getVerificationStatus = useCallback(() => {
    if (!gameData)
      return { canProceed: false, reason: "loading", message: "Loading..." };
    if (gameData.blockedRegion)
      return {
        canProceed: false,
        reason: "region_block",
        message:
          gameData.error || "This region is not allowed for this product.",
      };
    if (!hasSelectedPackages)
      return {
        canProceed: false,
        reason: "no_package",
        message: "Please select a package.",
      };
    if (!gameData.hasFields) return { canProceed: true };
    if (gameData.checking)
      return {
        canProceed: false,
        reason: "checking",
        message: "Verifying your Game ID...",
      };
    if (gameData.error)
      return { canProceed: false, reason: "error", message: gameData.error };
    if (gameData.regionMismatch)
      return {
        canProceed: false,
        reason: "region",
        message: `This product is for ${gameData.productRegionName} accounts only.`,
      };
    if (!gameData.isComplete)
      return {
        canProceed: false,
        reason: "incomplete",
        message: "Please fill in all required fields.",
      };
    if (gameData.hasValidation && !gameData.isValid)
      return {
        canProceed: false,
        reason: "not_verified",
        message: "Please verify your Game ID first.",
      };
    return { canProceed: true };
  }, [gameData, hasSelectedPackages]);

  const verificationStatus = getVerificationStatus();
  const isPaymentDisabled = !verificationStatus.canProceed;

  return (
    <div className="min-h-screen bg-accent-orange/10">
      <div className="mx-auto max-w-6xl p-3">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_380px] lg:gap-4">
          {/* Left Column */}
          <div className="space-y-3">
            {/* Product Banner */}
            <div className="rounded-xl bg-white p-3 shadow-md">
              <ProductBanner
                name={product.name}
                slug={product.slug}
                image={product.images?.[0]?.src}
                badges={product.product_badges || {}}
                categories={product.categories}
              />
            </div>

            {/* Mobile Tabs - only visible on mobile */}
            <div className="flex gap-2 rounded-xl bg-white p-1 shadow-sm lg:hidden">
              <button
                onClick={() => setActiveTab("order")}
                className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition ${
                  activeTab === "order"
                    ? "bg-orange-500 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                Order
              </button>
              <button
                onClick={() => setActiveTab("description")}
                className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition ${
                  activeTab === "description"
                    ? "bg-orange-500 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                Description
              </button>
            </div>

            {/* Game ID Section - always visible on desktop, conditional on mobile */}
            <div className={`${activeTab !== "order" ? "hidden lg:block" : ""}`}>
              <GameIdSection
                product={product}
                onGameDataChange={handleGameDataChange}
              />
            </div>

            {/* Package Selection - always visible on desktop, conditional on mobile */}
            <div className={`${activeTab !== "order" ? "hidden lg:block" : ""}`}>
              <PackageSelectionSection
                variations={variations}
                product={product}
                selectedPackages={selectedPackages}
                totalItems={totalItems}
                subtotal={subtotal}
                onTogglePackage={handleTogglePackage}
                onIncreaseQuantity={handleIncreaseQuantity}
                onDecreaseQuantity={handleDecreaseQuantity}
                onRemovePackage={handleRemovePackage}
                onClearAll={handleClearAllWithCoupon}
                unavailableVariations={gameData?.unavailableVariations || []}
                regionRestrictedVariations={
                  gameData?.regionRestrictedVariations || []
                }
              />
            </div>

            {/* Payment Section - only on mobile */}
            <div className={`lg:hidden ${activeTab !== "order" ? "hidden" : ""}`}>
              <PaymentSection
                selectedPayment={selectedPayment}
                onPaymentSelect={setSelectedPayment}
                hasSelectedPackages={hasSelectedPackages}
                subtotal={subtotal}
                discount={discount}
                total={total}
                appliedCoupon={appliedCoupon}
                onCouponApply={handleCouponApply}
                onCouponRemove={handleCouponRemove}
                isDisabled={isPaymentDisabled}
                gameData={gameData}
                verificationStatus={verificationStatus}
                isAuthenticated={isAuthenticated}
                walletBalance={walletBalance}
                loadingWallet={loadingWallet}
                product={product}
                selectedPackages={selectedPackages}
              />
            </div>

            {/* Description - always visible on desktop, conditional on mobile */}
            <div className={`${activeTab !== "description" ? "hidden lg:block" : ""}`}>
              <DescriptionSection description={product?.description} />
            </div>
          </div>

          {/* Right Column - Desktop Payment Section */}
          <div className="sticky top-[13dvh] hidden h-fit lg:block">
            <PaymentSection
              selectedPayment={selectedPayment}
              onPaymentSelect={setSelectedPayment}
              hasSelectedPackages={hasSelectedPackages}
              subtotal={subtotal}
              discount={discount}
              total={total}
              appliedCoupon={appliedCoupon}
              onCouponApply={handleCouponApply}
              onCouponRemove={handleCouponRemove}
              isDisabled={isPaymentDisabled}
              gameData={gameData}
              verificationStatus={verificationStatus}
              isAuthenticated={isAuthenticated}
              walletBalance={walletBalance}
              loadingWallet={loadingWallet}
              product={product}
              selectedPackages={selectedPackages}
            />
          </div>
        </div>
      </div>
    </div>
  );
}