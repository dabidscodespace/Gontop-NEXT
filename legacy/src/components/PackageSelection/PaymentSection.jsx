import {
  AlertCircle,
  Check,
  ChevronRight,
  Clock,
  Coins,
  Loader,
  Lock,
  LogIn,
  ShoppingCart,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../api/axios";
import { clearWalletCache, getWalletBalance } from "../../api/services/wallet";
import { Storage } from "../../api/utils/storage";
import bKash from "../../assets/Bkash.png";
import Nagad from "../../assets/Nagad.png";
import Rocket from "../../assets/rocket.png";
import { useShop } from "../../context/ShopContext";
import uddoktaPayService from "../../services/uddoktaPayService";

const ORDER_COOLDOWN_SECONDS = 60;
const COOLDOWN_STORAGE_KEY = "last_order_timestamp";

function formatCoinAmount(amount) {
  if (amount >= 10000) {
    const val = amount / 1000;
    return val % 1 === 0 ? `${val.toFixed(0)}k` : `${val.toFixed(1)}k`;
  }
  if (amount >= 1000) {
    const val = amount / 1000;
    return val % 1 === 0 ? `${val.toFixed(0)}k` : `${val.toFixed(1)}k`;
  }
  return amount.toFixed(0);
}

function CoinIcon({ className = "h-3.5 w-3.5" }) {
  return (
    <img src="/coin.png" alt="coin" className={`inline-block ${className}`} />
  );
}

export default function PaymentSection({
  selectedPayment,
  onPaymentSelect,
  hasSelectedPackages,
  subtotal,
  discount,
  total,
  appliedCoupon,
  isDisabled,
  gameData,
  verificationStatus,
  isAuthenticated,
  product,
  selectedPackages,
}) {
  const { user, openLoginPopup } = useShop();
  const navigate = useNavigate();

  const [processing, setProcessing] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loadingWallet, setLoadingWallet] = useState(true);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [useWallet, setUseWallet] = useState(false);

  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [isOnCooldown, setIsOnCooldown] = useState(false);

  const paymentMethods = [
    { id: "bkash", name: "bKash", logo: bKash },
    { id: "nagad", name: "Nagad", logo: Nagad },
    { id: "rocket", name: "Rocket", logo: Rocket },
  ];

  const walletApplied = useWallet ? Math.min(walletBalance, total) : 0;
  const amountToPay = Math.max(0, total - walletApplied);
  const isFullWalletPayment =
    useWallet && walletApplied >= total && walletApplied > 0;
  const hasWalletBalance = walletBalance > 0;

  const getCooldownRemaining = useCallback(() => {
    const lastOrderTime = localStorage.getItem(COOLDOWN_STORAGE_KEY);
    if (!lastOrderTime) return 0;
    const elapsed = Math.floor(
      (Date.now() - parseInt(lastOrderTime, 10)) / 1000,
    );
    const remaining = ORDER_COOLDOWN_SECONDS - elapsed;
    return remaining > 0 ? remaining : 0;
  }, []);

  const startCooldown = useCallback(() => {
    localStorage.setItem(COOLDOWN_STORAGE_KEY, Date.now().toString());
    setCooldownRemaining(ORDER_COOLDOWN_SECONDS);
    setIsOnCooldown(true);
  }, []);

  useEffect(() => {
    if (creatingOrder) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [creatingOrder]);

  useEffect(() => {
    const checkCooldown = () => {
      const remaining = getCooldownRemaining();
      setCooldownRemaining(remaining);
      setIsOnCooldown(remaining > 0);
    };
    checkCooldown();
    const interval = setInterval(() => {
      const remaining = getCooldownRemaining();
      setCooldownRemaining(remaining);
      setIsOnCooldown(remaining > 0);
      if (remaining <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [getCooldownRemaining]);

  useEffect(() => {
    if (!isOnCooldown || cooldownRemaining <= 0) return;
    const timer = setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          setIsOnCooldown(false);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isOnCooldown]);

  const formatCooldown = (seconds) => {
    if (seconds <= 0) return "";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0
      ? `${mins}:${secs.toString().padStart(2, "0")}`
      : `${secs}s`;
  };

  useEffect(() => {
    async function fetchWallet() {
      if (!isAuthenticated || !user?.email) {
        setWalletBalance(0);
        setLoadingWallet(false);
        return;
      }
      try {
        setLoadingWallet(true);
        clearWalletCache();
        const data = await getWalletBalance();
        setWalletBalance(data?.balance || 0);
      } catch (error) {
        console.error("[PaymentSection] Wallet error:", error);
        setWalletBalance(0);
      } finally {
        setLoadingWallet(false);
      }
    }
    fetchWallet();
  }, [isAuthenticated, user?.email]);

  useEffect(() => {
    if (!loadingWallet && walletBalance > 0) {
      setUseWallet(true);
      if (walletBalance >= total) {
        onPaymentSelect(null);
      }
    }
  }, [loadingWallet, walletBalance, total, onPaymentSelect]);

  const handleWalletToggle = () => {
    if (!hasWalletBalance || processing || isOnCooldown) return;
    const newUseWallet = !useWallet;
    setUseWallet(newUseWallet);
    if (newUseWallet && walletBalance >= total) {
      onPaymentSelect(null);
    }
  };

  const handlePaymentSelect = (methodId) => {
    if (processing || isOnCooldown) return;
    onPaymentSelect(methodId);
  };

  const getPaymentMethodTitle = (methodId) => {
    const method = paymentMethods.find((m) => m.id === methodId);
    return method?.name || "Mobile Banking";
  };

  const formatLabel = (key) =>
    key
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  const buildWapfMeta = () => {
    if (!gameData?.hasFields || !gameData.fields) return null;
    const fields = {};
    const settings = {};
    const fieldLabels = gameData.fieldLabels || {};

    Object.entries(gameData.fields).forEach(([id, val]) => {
      if (!val) return;
      const label = fieldLabels[id] || formatLabel(id);
      fields[id] = {
        id,
        type: "text",
        label,
        value: String(val),
        values: [{ label: String(val), price: 0, price_type: "none" }],
      };
      settings[label] = [{ field: id, hide: false }];
    });

    if (gameData.playerName) {
      fields.player_name = {
        id: "player_name",
        type: "text",
        label: "Player Name",
        value: gameData.playerName,
        values: [{ label: gameData.playerName, price: 0, price_type: "none" }],
      };
      settings["Player Name"] = [{ field: "player_name", hide: false }];
    }

    return Object.keys(fields).length > 0 ? { fields, settings } : null;
  };

  const buildLineItems = () => {
    const packages = Object.values(selectedPackages);
    if (packages.length === 0) return [];
    const wapf = buildWapfMeta();

    return packages.map((pkg) => {
      const variation = pkg.variation;
      const quantity = pkg.quantity || 1;
      const price = parseFloat(variation?.price) || 0;

      const lineItem = {
        product_id: product.id,
        variation_id: variation?.id || 0,
        quantity,
        subtotal: String(price * quantity),
        total: String(price * quantity),
        meta_data: [],
      };

      if (wapf) {
        lineItem.meta_data.push({ key: "_wapf_meta", value: wapf });

        const tmcpPostFields = {};
        const tmcartepoData = [];
        let fieldIndex = 0;

        Object.values(wapf.fields).forEach((field) => {
          if (field.label && field.value) {
            const tmcpKey = `tmcp_textfield_${fieldIndex}`;
            tmcpPostFields[tmcpKey] = field.value;
            tmcartepoData.push({ key: field.value, attribute: tmcpKey });
            fieldIndex++;
          }
        });

        lineItem.meta_data.push({
          key: "_tmdata",
          value: [
            {
              tmcp_post_fields: tmcpPostFields,
              product_id: product.id,
              per_product_pricing: true,
              cpf_product_price: String(price),
              variation_id: String(variation?.id || 0),
              form_prefix: "",
              tmcartepo_data: tmcartepoData,
            },
          ],
        });

        Object.values(wapf.fields).forEach((field) => {
          if (field.label && field.value) {
            lineItem.meta_data.push({ key: field.label, value: field.value });
          }
        });
      }
      return lineItem;
    });
  };

  const createOrder = async (paymentType) => {
    const customer = Storage.getCustomer();
    const lineItems = buildLineItems();
    if (lineItems.length === 0) throw new Error("No packages selected");

    const orderTotal = total;
    const walletAmount = paymentType === "wallet" ? orderTotal : walletApplied;
    const gatewayAmount = orderTotal - walletAmount;

    const metaData = [
      { key: "_has_game_fields", value: gameData?.hasFields ? "yes" : "no" },
      {
        key: "_game_fields_complete",
        value: gameData?.isComplete ? "yes" : "no",
      },
    ];

    if (paymentType === "wallet") {
      metaData.push(
        { key: "payment_type", value: "wallet_only" },
        { key: "_wallet_amount", value: String(orderTotal) },
      );
    } else if (paymentType === "hybrid") {
      metaData.push(
        { key: "payment_type", value: "hybrid" },
        { key: "_pending_wallet_amount", value: String(walletAmount) },
        { key: "_pending_gateway_amount", value: String(gatewayAmount) },
      );
    } else {
      metaData.push(
        { key: "payment_type", value: "gateway_only" },
        { key: "_pending_gateway_amount", value: String(orderTotal) },
      );
    }

    if (gameData?.hasFields && gameData.fields) {
      Object.entries(gameData.fields).forEach(([key, value]) => {
        if (value) {
          const label = gameData.fieldLabels?.[key] || formatLabel(key);
          metaData.push({ key: `Game: ${label}`, value: String(value) });
        }
      });
      if (gameData.playerName) {
        metaData.push({ key: "Game: Player Name", value: gameData.playerName });
      }
    }

    metaData.push({
      key: "_order_summary",
      value: `${lineItems.length} item(s), ${Object.values(selectedPackages).reduce((sum, pkg) => sum + pkg.quantity, 0)} total quantity`,
    });

    let paymentMethod, paymentMethodTitle, status;
    if (paymentType === "wallet") {
      paymentMethod = "terawallet";
      paymentMethodTitle = "G Coin Payment";
      status = "processing";
    } else if (paymentType === "hybrid") {
      paymentMethod = "uddoktapay";
      paymentMethodTitle = `${getPaymentMethodTitle(selectedPayment)} + G Coin`;
      status = "pending";
    } else {
      paymentMethod = "uddoktapay";
      paymentMethodTitle = getPaymentMethodTitle(selectedPayment);
      status = "pending";
    }

    const orderPayload = {
      customer_id: customer.customer_id || 0,
      payment_method: paymentMethod,
      payment_method_title: paymentMethodTitle,
      set_paid: false,
      status,
      billing: {
        first_name:
          (user?.name || user?.display_name || "").split(/\s+/)[0] || "",
        last_name:
          (user?.name || user?.display_name || "")
            .split(/\s+/)
            .slice(1)
            .join(" ") || "",
        email: user?.email || customer.email || "",
        phone: user?.phone || "",
      },
      line_items: lineItems,
      meta_data: metaData,
    };

    if (appliedCoupon?.code) {
      orderPayload.coupon_lines = [{ code: appliedCoupon.code }];
    }

    const response = await api.post("/orders", orderPayload);
    const order = response.data;
    if (!order?.id) throw new Error("Order creation failed");
    return order;
  };

  const handleWalletPayment = async () => {
    setCreatingOrder(true);
    try {
      const order = await createOrder("wallet");
      if (!order?.id) throw new Error("Order creation failed");
      localStorage.setItem("last_order_id", order.id);
      localStorage.setItem("last_payment_type", "wallet");
      try {
        clearWalletCache();
      } catch (e) {}
      toast.success("Payment successful!");
      navigate(`/checkout/success?order_id=${order.id}&payment_type=wallet`);
      return order;
    } finally {
      setCreatingOrder(false);
    }
  };

  const handleGatewayPayment = async (isHybrid) => {
    setCreatingOrder(true);
    try {
      const paymentType = isHybrid ? "hybrid" : "gateway";
      const walletAmount = isHybrid ? walletApplied : 0;
      const gatewayAmount = total - walletAmount;
      const order = await createOrder(paymentType);

      localStorage.setItem("last_order_id", order.id);
      localStorage.setItem("last_payment_type", paymentType);
      localStorage.setItem("last_wallet_amount", walletAmount);
      localStorage.setItem("last_gateway_amount", gatewayAmount);

      const paymentResponse = await uddoktaPayService.initPayment({
        order_id: order.id,
        wallet_amount: walletAmount,
        gateway_amount: gatewayAmount,
        payment_method: getPaymentMethodTitle(selectedPayment),
      });

      if (!paymentResponse.success || !paymentResponse.payment_url) {
        throw new Error(
          paymentResponse.message || "Payment initialization failed",
        );
      }

      localStorage.setItem("last_invoice_id", paymentResponse.invoice_id);
      window.location.href = paymentResponse.payment_url;
    } finally {
      setCreatingOrder(false);
    }
  };

  const handleBuyNow = async () => {
    if (isOnCooldown) {
      toast.warning(
        `Please wait ${formatCooldown(cooldownRemaining)} before placing another order.`,
      );
      return;
    }

    if (!verificationStatus?.canProceed) {
      toast.warning(
        verificationStatus?.message || "Please complete all required fields.",
      );
      return;
    }

    if (!hasSelectedPackages) {
      toast.warning("Please select at least one package.");
      return;
    }
    if (!isAuthenticated) {
      toast.warning("Please login to continue.");
      openLoginPopup();
      return;
    }
    if (!isFullWalletPayment && !selectedPayment) {
      toast.warning("Please select a payment method.");
      return;
    }

    setProcessing(true);
    try {
      clearWalletCache();
      const freshWallet = await getWalletBalance();
      const freshBalance = freshWallet?.balance || 0;
      setWalletBalance(freshBalance);

      const applied = useWallet ? Math.min(freshBalance, total) : 0;
      const remaining = total - applied;
      const fullWallet = useWallet && applied >= total && applied > 0;

      if (fullWallet) {
        await handleWalletPayment();
        startCooldown();
      } else if (remaining >= 10) {
        await handleGatewayPayment(applied > 0);
        startCooldown();
      } else if (remaining > 0 && remaining < 10) {
        toast.error("Minimum gateway payment is ৳10");
      } else {
        toast.error("Invalid payment amount");
      }
    } catch (error) {
      console.error("[PaymentSection] Error:", error);
      if (error.message !== "Session expired. Please log in again.") {
        toast.error(error.message || "Payment failed. Please try again.");
      }
    } finally {
      setProcessing(false);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // NOT AUTHENTICATED UI
  // ═══════════════════════════════════════════════════════════
  if (!isAuthenticated) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10">
              <div className="absolute bottom-0 left-1 h-8 w-8 rounded-lg bg-orange-300" />
              <div className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 text-sm font-bold text-white shadow-md">
                3
              </div>
            </div>
            <h3 className="text-sm font-bold text-gray-800">Payment</h3>
          </div>
        </div>

        <div className="rounded-xl bg-gray-50 p-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/10">
            <LogIn className="h-6 w-6 text-orange-500" />
          </div>
          <p className="mb-1 text-base font-semibold text-gray-800">
            Login to continue
          </p>
          <p className="mb-4 text-sm text-gray-500">
            Sign in with Google to complete your purchase
          </p>
          <button
            onClick={openLoginPopup}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 py-3 text-sm font-medium text-white transition-colors hover:bg-orange-600"
          >
            <LogIn className="h-4 w-4" />
            Sign in with Google
          </button>
        </div>

        {hasSelectedPackages && (
          <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
            <span className="text-sm text-gray-600">Total</span>
            <span className="text-lg font-bold text-orange-500">
              ৳{total.toFixed(2)}
            </span>
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // AUTHENTICATED UI
  // ═══════════════════════════════════════════════════════════

  const isButtonDisabled =
    !verificationStatus?.canProceed ||
    processing ||
    !hasSelectedPackages ||
    loadingWallet ||
    isOnCooldown ||
    (!isFullWalletPayment && !selectedPayment);

  let buttonLabel = "";
  if (processing) buttonLabel = "Processing...";
  else if (isOnCooldown)
    buttonLabel = `Wait ${formatCooldown(cooldownRemaining)}`;
  else if (
    !verificationStatus?.canProceed &&
    verificationStatus?.reason === "checking"
  )
    buttonLabel = "Verifying ID...";
  else if (
    !verificationStatus?.canProceed &&
    verificationStatus?.reason === "region_block"
  )
    buttonLabel = "Region Blocked";
  else if (
    !verificationStatus?.canProceed &&
    verificationStatus?.reason === "error"
  )
    buttonLabel = "Invalid Game ID";
  else if (
    !verificationStatus?.canProceed &&
    verificationStatus?.reason === "not_verified"
  )
    buttonLabel = "Verify Game ID";
  else if (
    !verificationStatus?.canProceed &&
    verificationStatus?.reason === "region"
  )
    buttonLabel = "Wrong Region";
  else if (
    !verificationStatus?.canProceed &&
    verificationStatus?.reason === "incomplete"
  )
    buttonLabel = "Fill Game Info";
  else if (!verificationStatus?.canProceed) buttonLabel = "Unavailable";
  else if (!hasSelectedPackages) buttonLabel = "Select Package";
  else if (loadingWallet) buttonLabel = "Loading...";
  else if (!isFullWalletPayment && !selectedPayment)
    buttonLabel = "Select Payment";
  else buttonLabel = `Pay ৳${amountToPay.toFixed(0)}`;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10">
            <div className="absolute bottom-0 left-1 h-8 w-8 rounded-lg bg-orange-300" />
            <div className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 text-sm font-bold text-white shadow-md">
              3
            </div>
          </div>
          <h3 className="text-sm font-bold text-gray-800">Payment</h3>
        </div>

        {isOnCooldown && (
          <div className="flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
            <Clock className="h-3 w-3" />
            {formatCooldown(cooldownRemaining)}
          </div>
        )}
      </div>

      {loadingWallet ? (
        <div className="flex items-center justify-center gap-2 py-8 text-gray-400">
          <Loader className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      ) : (
        <>
          {/* G Coin Section */}
          <div className="mb-4">
            <div
              onClick={hasWalletBalance ? handleWalletToggle : undefined}
              className={`flex items-center justify-between rounded-xl border-2 p-3 transition-all ${
                hasWalletBalance
                  ? useWallet
                    ? "border-orange-500 bg-orange-500/5 cursor-pointer"
                    : "border-gray-200 hover:border-gray-300 cursor-pointer"
                  : "border-gray-100 bg-gray-50/50 cursor-not-allowed"
              } ${processing || isOnCooldown ? "pointer-events-none opacity-50" : ""}`}
            >
              <div className="flex items-center gap-3">
                {/* Toggle */}
                <div
                  className={`relative h-5 w-9 rounded-full transition-all ${
                    useWallet && hasWalletBalance
                      ? "bg-orange-500"
                      : "bg-gray-200"
                  } ${!hasWalletBalance ? "opacity-50" : ""}`}
                >
                  <div
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${
                      useWallet && hasWalletBalance ? "left-[18px]" : "left-0.5"
                    }`}
                  />
                </div>

                {/* Icon & Label */}
                <div className="flex items-center gap-2">
                  <div
                    className={`flex items-center justify-center rounded-lg ${
                      useWallet && hasWalletBalance
                        ? "bg-orange-500/10"
                        : "bg-gray-100"
                    }`}
                  >
                    <CoinIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">G Coin</p>
                    <p className="flex items-center gap-1 text-xs text-gray-500">
                      Balance: <CoinIcon className="h-3 w-3" />
                      <span className="font-medium">
                        {formatCoinAmount(walletBalance)}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Applied Amount */}
              {useWallet && hasWalletBalance && hasSelectedPackages && (
                <div className="flex items-center gap-1 text-sm font-semibold text-orange-500">
                  <span className="flex items-center gap-0.5">
                    -<CoinIcon className="h-3.5 w-3.5" />
                    {formatCoinAmount(walletApplied)}
                  </span>
                  <Check className="h-4 w-4" />
                </div>
              )}

              {!hasWalletBalance && (
                <span className="text-xs text-gray-400">No balance</span>
              )}
            </div>
          </div>

          {/* Payment Methods */}
          {!isFullWalletPayment && (
            <div className="mb-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                {useWallet && walletApplied > 0
                  ? `Pay ৳${amountToPay.toFixed(0)} via`
                  : "Payment Method"}
              </p>
              <div className="flex gap-2">
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => handlePaymentSelect(method.id)}
                    disabled={processing || isOnCooldown}
                    className={`relative flex flex-1 flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition-all ${
                      selectedPayment === method.id
                        ? "border-orange-500 bg-orange-500/5"
                        : "border-gray-200 hover:border-gray-300"
                    } ${
                      processing || isOnCooldown
                        ? "opacity-50 cursor-not-allowed"
                        : "cursor-pointer"
                    }`}
                  >
                    <div className="flex h-8 w-full items-center justify-center">
                      <img
                        src={method.logo}
                        alt={method.name}
                        className="h-6 w-auto object-contain"
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-700">
                      {method.name}
                    </span>
                    {selectedPayment === method.id && (
                      <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500">
                        <Check className="h-2.5 w-2.5 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Full G Coin Payment */}
          {isFullWalletPayment && (
            <div className="mb-4 flex items-center justify-center gap-2 rounded-xl bg-green-50 py-3 text-sm font-medium text-green-700">
              <CoinIcon className="h-6 w-6" />
              Full payment with G Coin
            </div>
          )}

          {/* Order Summary */}
          {hasSelectedPackages && (
            <div className="mb-4 rounded-xl bg-gray-50 p-3">
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>৳{subtotal.toFixed(0)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-৳{discount.toFixed(0)}</span>
                  </div>
                )}
                {walletApplied > 0 && (
                  <div className="flex justify-between text-orange-500">
                    <span className="flex items-center gap-1">
                      <CoinIcon className="h-3 w-3" />G Coin
                    </span>
                    <span className="flex items-center gap-0.5">
                      -<CoinIcon className="h-3 w-3" />
                      {formatCoinAmount(walletApplied)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t border-gray-200 pt-2 font-semibold">
                  <span>Total</span>
                  <span className="text-orange-500">
                    ৳{amountToPay.toFixed(0)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* No Package Selected Warning */}
          {!hasSelectedPackages && (
            <div className="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-xs font-medium text-amber-700">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>Please select at least one package to continue.</span>
            </div>
          )}


          {/* Verification Status Message */}
          {!verificationStatus?.canProceed &&
            verificationStatus?.message &&
            verificationStatus?.reason !== "no_package" && (
              <div
                className={`mb-3 flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs font-medium ${
                  verificationStatus.reason === "checking"
                    ? "bg-blue-50 text-blue-600"
                    : verificationStatus.reason === "region" ||
                        verificationStatus.reason === "region_block" ||
                        verificationStatus.reason === "error" ||
                        verificationStatus.reason === "not_verified"
                      ? "bg-red-50 text-red-600"
                      : "bg-amber-50 text-amber-700"
                }`}
              >
                {verificationStatus.reason === "checking" ? (
                  <Loader className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin" />
                ) : (
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                )}
                <span>{verificationStatus.message}</span>
              </div>
            )}

          {/* Buy Button */}
          <button
            onClick={handleBuyNow}
            disabled={isButtonDisabled}
            className={`flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold transition-all ${
              isButtonDisabled
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-orange-500 text-white hover:bg-orange-600 active:scale-[0.98]"
            }`}
          >
            {processing ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : isOnCooldown ? (
              <Clock className="h-4 w-4" />
            ) : (
              <ShoppingCart className="h-4 w-4" />
            )}
            {buttonLabel}
            {!isButtonDisabled && !processing && !isOnCooldown && (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>

          {/* Security Badge */}
          <p className="mt-3 flex items-center justify-center gap-1 text-[10px] text-gray-400">
            <Lock className="h-3 w-3" />
            Secured by SSL
          </p>
        </>
      )}

      {/* Creating Order Overlay */}
      {creatingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 rounded-2xl bg-white p-8 shadow-xl">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-500/10">
              <Loader className="h-6 w-6 animate-spin text-orange-500" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-gray-800">Creating Order</p>
              <p className="text-sm text-gray-500">Please wait...</p>
            </div>
            <div className="h-1 w-32 overflow-hidden rounded-full bg-gray-200">
              <div className="h-full w-1/2 animate-[progress_1.5s_ease-in-out_infinite] rounded-full bg-orange-500" />
            </div>
          </div>
          <style>{`
            @keyframes progress {
              0% { transform: translateX(-100%); }
              50% { transform: translateX(0%); }
              100% { transform: translateX(100%); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
