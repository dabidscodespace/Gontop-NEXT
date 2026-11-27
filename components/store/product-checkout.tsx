"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  Check,
  ChevronDown,
  Clock,
  Info,
  Loader2,
  LogIn,
  Minus,
  Plus,
  ShieldCheck,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

import type { ProductBadges, ProductField } from "@/db/schema";
import { formatBDT, money, round2 } from "@/lib/money";

type Variation = {
  id: number;
  name: string;
  description: string;
  price: string;
  compareAtPrice: string | null;
  image: string | null;
  stockStatus: "instock" | "outofstock";
  stockQuantity: number | null;
  fields: ProductField[];
  topupMethodName: string;
};

type Product = {
  id: number;
  name: string;
  slug: string;
  image: string | null;
  description: string;
  shortDescription: string;
  badges: ProductBadges;
  fields: ProductField[];
  instructions: string;
};

const PAYMENT_METHODS = [
  { id: "bkash", name: "bKash", logo: "/assets/Bkash.png" },
  { id: "nagad", name: "Nagad", logo: "/assets/Nagad.png" },
  { id: "rocket", name: "Rocket", logo: "/assets/rocket.png" },
];

function parsePackageName(name: string) {
  const parts = name.split(/[-()]/).map((part) => part.trim()).filter(Boolean);
  return { main: parts[0] || name, bonus: parts[1] || "" };
}

/** Merges field lists by id, keeping the first definition of each field. */
function mergeFields(lists: ProductField[][]) {
  const byId = new Map<string, ProductField>();
  for (const list of lists) for (const field of list) if (!byId.has(field.id)) byId.set(field.id, field);
  return [...byId.values()];
}

function decodeHtml(value: string) {
  return value.replace(/<[^>]*>/g, "").trim();
}

export function ProductCheckout({
  product,
  game,
  variations,
  user,
  walletBalance,
  settings,
}: {
  product: Product;
  game: { name: string; instructions: string; image: string | null };
  variations: Variation[];
  user: { email: string; name: string } | null;
  walletBalance: number;
  settings: { walletPaymentsEnabled: boolean; minOrderAmount: number };
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Record<number, number>>({});
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [paymentMethod, setPaymentMethod] = useState("bkash");
  const [useWallet, setUseWallet] = useState(walletBalance > 0);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [infoOpen, setInfoOpen] = useState(false);
  const [descriptionOpen, setDescriptionOpen] = useState(false);

  const selectedEntries = Object.entries(selected).filter(([, quantity]) => quantity > 0);
  const subtotal = useMemo(
    () =>
      round2(
        selectedEntries.reduce((sum, [variationId, quantity]) => {
          const variation = variations.find((item) => item.id === Number(variationId));
          return sum + money(variation?.price) * quantity;
        }, 0),
      ),
    [selectedEntries, variations],
  );

  const totalItems = selectedEntries.reduce((sum, [, quantity]) => sum + quantity, 0);
  const walletApplied =
    useWallet && settings.walletPaymentsEnabled ? Math.min(walletBalance, subtotal) : 0;
  const remaining = round2(subtotal - walletApplied);
  const fullWallet = walletApplied > 0 && remaining === 0;
  const hasWalletBalance = walletBalance > 0;

  // Required fields follow the selected packages (each package's own fields when
  // overridden); with nothing selected, the product's fields are shown.
  const pickedVariations = variations.filter((variation) => selected[variation.id] > 0);
  const activeFields = pickedVariations.length
    ? mergeFields(pickedVariations.map((variation) => variation.fields))
    : product.fields;
  const topupMethodNames = [...new Set(pickedVariations.map((variation) => variation.topupMethodName).filter(Boolean))];

  const missingFields = activeFields.filter(
    (field) => field.required && !String(fieldValues[field.id] ?? "").trim(),
  );

  function togglePackage(variation: Variation) {
    if (variation.stockStatus === "outofstock") return;
    setSelected((current) => {
      const next = { ...current };
      if (next[variation.id]) delete next[variation.id];
      else next[variation.id] = 1;
      return next;
    });
  }

  function changeQuantity(variationId: number, delta: number) {
    setSelected((current) => {
      const variation = variations.find((item) => item.id === variationId);
      const max = variation?.stockQuantity ?? 20;
      const quantity = Math.min(max, Math.max(0, (current[variationId] ?? 0) + delta));
      const next = { ...current };
      if (quantity <= 0) delete next[variationId];
      else next[variationId] = quantity;
      return next;
    });
  }

  async function placeOrder() {
    setError("");

    if (!user) {
      router.push(`/login?next=/product/${product.slug}`);
      return;
    }
    if (selectedEntries.length === 0) {
      setError("Please select a package.");
      return;
    }
    if (missingFields.length > 0) {
      setError(`Please fill in: ${missingFields.map((field) => field.label).join(", ")}.`);
      return;
    }
    if (subtotal < settings.minOrderAmount) {
      setError(`Minimum order amount is ${formatBDT(settings.minOrderAmount)}.`);
      return;
    }
    if (!fullWallet && remaining < settings.minOrderAmount) {
      setError(`The gateway amount must be at least ${formatBDT(settings.minOrderAmount)}.`);
      return;
    }

    const paymentType = fullWallet ? "wallet" : walletApplied > 0 ? "hybrid" : "gateway";

    setProcessing(true);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          items: selectedEntries.map(([variationId, quantity]) => ({
            variationId: Number(variationId),
            quantity,
          })),
          playerFields: fieldValues,
          paymentType,
          walletAmount: walletApplied,
          customerNote: "",
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Could not place the order.");
      }

      if (data.paymentUrl) {
        // Same tab, as required.
        window.location.href = data.paymentUrl;
        return;
      }

      router.push(`/orders/${data.publicId}`);
      router.refresh();
    } catch (orderError) {
      setError(orderError instanceof Error ? orderError.message : "Could not place the order.");
    } finally {
      setProcessing(false);
    }
  }

  const badges = product.badges ?? {};
  const bannerImage = badges.banner || null;

  return (
    <div className="mx-auto max-w-6xl p-3">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_380px] lg:gap-4">
        <div className="space-y-3">
          <div className="rounded-xl bg-white p-3 shadow-md">
            {bannerImage && (
              <img
                src={bannerImage}
                alt={`${product.name} banner`}
                className="w-full rounded-t-lg object-cover"
              />
            )}
            <div className="mt-4 flex items-center gap-5 text-black/90">
              <img
                src={product.image || game.image || "/logo-2.png"}
                alt={`${product.name} icon`}
                className="h-20 w-20 rounded-xl object-cover"
              />
              <div>
                <h1 className="text-lg font-semibold leading-tight tracking-wide">{product.name}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-black">
                  {badges.static?.label && (
                    <span className="flex items-center gap-1">
                      {badges.static.icon && (
                        <img src={badges.static.icon} alt="" className="w-6 select-none" />
                      )}
                      {badges.static.label}
                    </span>
                  )}
                  {badges.delivery?.label && (
                    <span className="flex items-center gap-1">
                      {badges.delivery.icon && (
                        <img src={badges.delivery.icon} alt="" className="w-6 select-none" />
                      )}
                      {badges.delivery.label}
                    </span>
                  )}
                  {badges.region?.name && (
                    <span className="flex items-center gap-2">
                      <img
                        src={badges.region.icon || "/global.gif"}
                        alt=""
                        className="h-4 w-4 rounded-full object-cover"
                      />
                      {badges.region.name} Region
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-emerald-600">
                    <ShieldCheck className="h-4 w-4" /> Secure delivery
                  </span>
                </div>
              </div>
            </div>
          </div>

          {game.instructions && (
            <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-700">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="whitespace-pre-line">{game.instructions}</p>
            </div>
          )}

          {product.instructions && (
            <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-700">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="whitespace-pre-line">{product.instructions}</p>
            </div>
          )}

          {activeFields.length > 0 && (
            <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-3">
              <div className="flex items-center gap-3">
                <StepNumber number={1} />
                <h2 className="text-sm font-bold text-gray-800">Enter Game Details</h2>
                {topupMethodNames.length > 0 && (
                  <span className="text-xs text-gray-500">Top-up method: {topupMethodNames.join(", ")}</span>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                {activeFields.map((field) => (
                  <div key={field.id} className="min-w-[calc(50%-0.375rem)] flex-1 space-y-1">
                    <label
                      htmlFor={`field-${field.id}`}
                      className="block text-xs font-medium text-gray-600"
                    >
                      {decodeHtml(field.label)}
                      {field.required && <span className="ml-0.5 text-red-500">*</span>}
                    </label>

                    {field.type === "select" ? (
                      <select
                        id={`field-${field.id}`}
                        value={fieldValues[field.id] ?? ""}
                        onChange={(event) =>
                          setFieldValues((current) => ({
                            ...current,
                            [field.id]: event.target.value,
                          }))
                        }
                        className="h-12 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      >
                        <option value="">{field.placeholder || `Select ${field.label}`}</option>
                        {(field.options ?? []).map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : field.type === "textarea" ? (
                      <textarea
                        id={`field-${field.id}`}
                        value={fieldValues[field.id] ?? ""}
                        placeholder={field.placeholder || field.label}
                        onChange={(event) =>
                          setFieldValues((current) => ({
                            ...current,
                            [field.id]: event.target.value,
                          }))
                        }
                        rows={3}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      />
                    ) : (
                      <input
                        id={`field-${field.id}`}
                        type={field.type === "password" ? "password" : field.type}
                        inputMode={field.type === "number" ? "numeric" : undefined}
                        value={fieldValues[field.id] ?? ""}
                        placeholder={field.placeholder || field.label}
                        onChange={(event) =>
                          setFieldValues((current) => ({
                            ...current,
                            [field.id]: event.target.value,
                          }))
                        }
                        className="h-12 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-orange-500 focus:bg-orange-50/50 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      />
                    )}
                  </div>
                ))}
              </div>

              <p className="flex items-center gap-1.5 text-xs text-gray-500">
                <AlertCircle className="h-3.5 w-3.5 text-orange-500" />
                Double-check your details. Top-ups are delivered to the account you enter.
              </p>
            </section>
          )}

          <section className="space-y-4 overflow-hidden rounded-xl border border-gray-200 bg-white p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <StepNumber number={activeFields.length > 0 ? 2 : 1} />
                <h2 className="text-sm font-bold text-gray-800">Select Package(s)</h2>
              </div>
              {totalItems > 0 && (
                <span className="rounded-full bg-[#FE642C]/10 px-3 py-1 text-xs font-semibold text-[#FE642C]">
                  {totalItems} {totalItems === 1 ? "item" : "items"} selected
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {variations.map((variation) => {
                const { main, bonus } = parsePackageName(variation.name);
                const quantity = selected[variation.id] ?? 0;
                const out =
                  variation.stockStatus === "outofstock" ||
                  (variation.stockQuantity !== null && variation.stockQuantity <= 0);
                const lowStock =
                  variation.stockQuantity !== null &&
                  variation.stockQuantity > 0 &&
                  variation.stockQuantity <= 5;

                return (
                  <div key={variation.id} className="relative">
                    {variation.description && (
                      <button
                        onClick={() => setInfoOpen(true)}
                        aria-label="View package details"
                        className="absolute -right-2 -top-2 z-30 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-orange-500 text-white shadow-md transition hover:scale-110"
                      >
                        <Info className="h-3 w-3" />
                      </button>
                    )}

                    <div
                      onClick={() => togglePackage(variation)}
                      className={`group relative flex h-full flex-col overflow-hidden rounded-xl border-2 transition-all duration-300 ${
                        out
                          ? "cursor-not-allowed border-gray-200 bg-gray-50"
                          : quantity > 0
                            ? "cursor-pointer border-orange-500 bg-gradient-to-br from-orange-50 to-white shadow-lg shadow-orange-500/10"
                            : "cursor-pointer border-gray-200 bg-white hover:border-orange-300 hover:shadow-md"
                      }`}
                    >
                      {quantity > 0 && !out && (
                        <div className="absolute -right-px -top-px z-10 flex h-6 w-6 items-center justify-center rounded-bl-lg bg-orange-500">
                          <Check className="h-3 w-3 text-white" strokeWidth={3} />
                        </div>
                      )}

                      {out && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60 backdrop-blur-[1px]">
                          <span className="rounded-full bg-gray-800/80 px-3 py-1.5 text-[10px] font-semibold text-white">
                            Out of Stock
                          </span>
                        </div>
                      )}

                      <div className="flex flex-1 gap-2 p-2.5 sm:gap-3 sm:p-3">
                        <div className="relative flex aspect-square w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-100 sm:w-12 md:w-14">
                          <img
                            src={variation.image || product.image || game.image || "/logo-2.png"}
                            alt={main}
                            loading="lazy"
                            className="h-full w-full rounded-xl object-contain p-1 transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col justify-between">
                          <div>
                            <h3
                              className={`line-clamp-2 text-xs font-semibold leading-tight sm:text-sm md:text-base ${
                                out ? "text-gray-400" : "text-gray-800"
                              }`}
                            >
                              {main}
                            </h3>
                            {bonus && (
                              <p className="mt-0.5 line-clamp-1 text-[10px] font-medium text-orange-500 sm:text-xs">
                                {bonus}
                              </p>
                            )}
                          </div>
                          {lowStock && (
                            <span className="mt-1.5 inline-flex w-fit items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-orange-600">
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-500" />
                              {variation.stockQuantity} left
                            </span>
                          )}
                        </div>
                      </div>

                      <div
                        className={`border-t px-2 py-2 sm:px-3 ${
                          quantity > 0 && !out
                            ? "border-orange-100 bg-orange-50/50"
                            : "border-gray-100 bg-gray-50/50"
                        }`}
                      >
                        {quantity > 0 && !out ? (
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(event) => {
                                  event.stopPropagation();
                                  changeQuantity(variation.id, -1);
                                }}
                                aria-label="Decrease quantity"
                                className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-gray-600 shadow-sm hover:bg-gray-100 sm:h-8 sm:w-8"
                              >
                                {quantity === 1 ? (
                                  <X className="h-3.5 w-3.5 text-red-500" />
                                ) : (
                                  <Minus className="h-3.5 w-3.5" />
                                )}
                              </button>
                              <span className="min-w-[1.5rem] text-center text-xs font-bold text-gray-800 sm:text-base">
                                {quantity}
                              </span>
                              <button
                                onClick={(event) => {
                                  event.stopPropagation();
                                  changeQuantity(variation.id, 1);
                                }}
                                aria-label="Increase quantity"
                                disabled={
                                  variation.stockQuantity !== null &&
                                  quantity >= variation.stockQuantity
                                }
                                className="flex h-7 w-7 items-center justify-center rounded-md bg-orange-500 text-white shadow-sm hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 sm:h-8 sm:w-8"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <p className="text-xs font-bold text-orange-600 sm:text-sm">
                              {formatBDT(money(variation.price) * quantity)}
                            </p>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="flex min-w-0 flex-1 items-baseline gap-1">
                              <p
                                className={`truncate text-xs font-bold sm:text-sm ${
                                  out ? "text-gray-400" : "text-gray-800"
                                }`}
                              >
                                {formatBDT(variation.price)}
                              </p>
                              {variation.compareAtPrice &&
                                money(variation.compareAtPrice) > money(variation.price) && (
                                  <p className="shrink-0 text-[9px] text-gray-400 line-through sm:text-xs">
                                    {formatBDT(variation.compareAtPrice)}
                                  </p>
                                )}
                            </div>
                            {!out && (
                              <button
                                onClick={(event) => {
                                  event.stopPropagation();
                                  togglePackage(variation);
                                }}
                                className="flex shrink-0 items-center gap-0.5 rounded-md bg-orange-500 px-2 py-1 text-[10px] font-semibold text-white hover:bg-orange-600 sm:rounded-lg sm:px-3 sm:py-1.5 sm:text-xs"
                              >
                                <Plus className="h-3 w-3" /> Add
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {variations.length === 0 && (
              <p className="py-6 text-center text-sm text-gray-500">
                No packages are available for this product yet.
              </p>
            )}
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-3">
            <button
              onClick={() => setDescriptionOpen((current) => !current)}
              className="flex w-full items-center justify-between text-sm font-bold text-gray-800"
            >
              Description
              <ChevronDown
                className={`h-4 w-4 transition-transform ${descriptionOpen ? "rotate-180" : ""}`}
              />
            </button>
            {descriptionOpen && (
              <div
                className="prose-gontop mt-3 text-sm leading-relaxed text-gray-600"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            )}
          </section>
        </div>

        <aside className="h-fit lg:sticky lg:top-[13vh]">
          <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <StepNumber number={3} />
              <h2 className="text-sm font-bold text-gray-800">Payment</h2>
            </div>

            {!user ? (
              <div className="rounded-xl bg-gray-50 p-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/10">
                  <LogIn className="h-6 w-6 text-orange-500" />
                </div>
                <p className="mb-1 text-base font-semibold text-gray-800">Login to continue</p>
                <p className="mb-4 text-sm text-gray-500">
                  Sign in to complete your purchase and track your order.
                </p>
                <Link
                  href={`/login?next=/product/${product.slug}`}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 py-3 text-sm font-medium text-white hover:bg-orange-600"
                >
                  <LogIn className="h-4 w-4" /> Sign in
                </Link>
              </div>
            ) : (
              <>
                <div
                  onClick={() => hasWalletBalance && setUseWallet((current) => !current)}
                  className={`mb-4 flex items-center justify-between rounded-xl border-2 p-3 transition-all ${
                    hasWalletBalance
                      ? useWallet
                        ? "cursor-pointer border-orange-500 bg-orange-500/5"
                        : "cursor-pointer border-gray-200 hover:border-gray-300"
                      : "cursor-not-allowed border-gray-100 bg-gray-50/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`relative h-5 w-9 rounded-full transition-all ${
                        useWallet && hasWalletBalance ? "bg-orange-500" : "bg-gray-200"
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${
                          useWallet && hasWalletBalance ? "left-[18px]" : "left-0.5"
                        }`}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">G Coin</p>
                      <p className="text-xs text-gray-500">
                        Balance: {formatBDT(walletBalance)}
                      </p>
                    </div>
                    <img src="/coin.png" alt="" className="h-6 w-6 object-contain" />
                  </div>
                  {useWallet && walletApplied > 0 && (
                    <span className="flex items-center gap-1 text-sm font-semibold text-orange-500">
                      -{formatBDT(walletApplied)} <Check className="h-4 w-4" />
                    </span>
                  )}
                  {!hasWalletBalance && <span className="text-xs text-gray-400">No balance</span>}
                </div>

                {!fullWallet && (
                  <div className="mb-4">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                      {walletApplied > 0 ? `Pay ${formatBDT(remaining)} via` : "Payment Method"}
                    </p>
                    <div className="flex gap-2">
                      {PAYMENT_METHODS.map((method) => (
                        <button
                          key={method.id}
                          onClick={() => setPaymentMethod(method.id)}
                          className={`flex flex-1 flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition-all ${
                            paymentMethod === method.id
                              ? "border-orange-500 bg-orange-500/5"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <img
                            src={method.logo}
                            alt={method.name}
                            className="h-7 w-auto object-contain"
                          />
                          <span className="text-[11px] font-medium text-gray-700">{method.name}</span>
                        </button>
                      ))}
                    </div>
                    <p className="mt-1.5 text-[10px] text-gray-400">
                      You will choose and confirm your method on the secure gateway page.
                    </p>
                  </div>
                )}

                <div className="space-y-2 border-t border-gray-100 pt-3 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span className="font-medium">{formatBDT(subtotal)}</span>
                  </div>
                  {walletApplied > 0 && (
                    <div className="flex justify-between text-orange-500">
                      <span>G Coin</span>
                      <span className="font-medium">-{formatBDT(walletApplied)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                    <span className="font-semibold text-gray-800">Total</span>
                    <span className="text-lg font-bold text-orange-500">{formatBDT(subtotal)}</span>
                  </div>
                  {!fullWallet && walletApplied > 0 && (
                    <p className="text-right text-[10px] text-gray-400">
                      Pay now: {formatBDT(remaining)}
                    </p>
                  )}
                </div>

                {error && (
                  <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-600">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                <button
                  onClick={placeOrder}
                  disabled={
                    processing ||
                    selectedEntries.length === 0 ||
                    missingFields.length > 0 ||
                    (!fullWallet && remaining < settings.minOrderAmount)
                  }
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Processing...
                    </>
                  ) : selectedEntries.length === 0 ? (
                    "Select Package"
                  ) : missingFields.length > 0 ? (
                    "Fill Game Info"
                  ) : !fullWallet && remaining < settings.minOrderAmount ? (
                    "Amount Too Low"
                  ) : fullWallet ? (
                    `Pay ${formatBDT(subtotal)} with G Coin`
                  ) : (
                    `Pay ${formatBDT(remaining)}`
                  )}
                </button>

                <div className="mt-3 flex items-center justify-center gap-3 text-[10px] text-gray-400">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" /> Secure
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Instant delivery
                  </span>
                </div>
              </>
            )}
          </div>
        </aside>
      </div>

      {infoOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setInfoOpen(false)}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-orange-500 to-orange-400 px-4 py-4">
              <h3 className="text-sm font-bold text-white">Package details</h3>
            </div>
            <div className="max-h-[50vh] overflow-y-auto px-4 py-4 text-sm leading-relaxed text-gray-600">
              {variations
                .filter((variation) => variation.description)
                .map((variation) => (
                  <div key={variation.id} className="mb-3">
                    <p className="font-semibold text-gray-800">{variation.name}</p>
                    <div
                      className="prose-gontop mt-1 text-xs"
                      dangerouslySetInnerHTML={{ __html: variation.description }}
                    />
                  </div>
                ))}
            </div>
            <div className="border-t border-gray-100 px-4 py-3">
              <button
                onClick={() => setInfoOpen(false)}
                className="w-full rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StepNumber({ number }: { number: number }) {
  return (
    <div className="relative h-10 w-10 shrink-0">
      <div className="absolute bottom-0 left-1 h-8 w-8 rounded-lg bg-orange-300" />
      <div className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 text-sm font-bold text-white shadow-md">
        {number}
      </div>
    </div>
  );
}
