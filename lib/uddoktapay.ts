import "server-only";

import { AppError } from "@/lib/money";

export type UddoktaChargeInput = {
  fullName: string;
  email: string;
  amount: number;
  metadata: Record<string, string | number>;
  redirectUrl: string;
  cancelUrl: string;
  webhookUrl: string;
};

export type UddoktaVerifyResult = {
  status: "COMPLETED" | "PENDING" | "ERROR" | "UNKNOWN";
  amount: number;
  invoiceId: string | null;
  transactionId: string | null;
  paymentMethod: string | null;
  senderNumber: string | null;
  metadata: Record<string, unknown>;
  raw: Record<string, unknown>;
  message?: string;
};

function gatewayUrl() {
  const raw = process.env.UDDOKTAPAY_BASE_URL?.trim() || "https://sandbox.uddoktapay.com";
  const base = raw.replace(/\/+$/, "");
  return base.endsWith("/api") ? base : `${base}/api`;
}

export function paymentGatewayConfigured() {
  return Boolean(process.env.UDDOKTAPAY_API_KEY?.trim());
}

function apiKey() {
  const key = process.env.UDDOKTAPAY_API_KEY?.trim();
  if (!key) {
    throw new AppError("The payment gateway is not configured on this server.", 503, "GATEWAY_UNCONFIGURED");
  }
  return key;
}

async function gatewayFetch(pathname: string, body: Record<string, unknown>) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const response = await fetch(`${gatewayUrl()}${pathname}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "RT-UDDOKTAPAY-API-KEY": apiKey(),
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: controller.signal,
    });

    const text = await response.text();
    let data: Record<string, unknown> = {};
    try {
      data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
    } catch {
      throw new AppError("The payment gateway returned an invalid response.", 502);
    }

    if (!response.ok) {
      throw new AppError(
        typeof data.message === "string" ? data.message : "Payment gateway request failed.",
        502,
      );
    }

    return data;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("Could not reach the payment gateway. Please try again.", 502);
  } finally {
    clearTimeout(timeout);
  }
}

export async function createCharge(input: UddoktaChargeInput) {
  const data = await gatewayFetch("/checkout-v2", {
    full_name: input.fullName,
    email: input.email,
    amount: input.amount.toFixed(2),
    metadata: input.metadata,
    redirect_url: input.redirectUrl,
    return_type: "GET",
    cancel_url: input.cancelUrl,
    webhook_url: input.webhookUrl,
  });

  const paymentUrl = data.payment_url;
  const invoiceId = data.invoice_id;

  if (typeof paymentUrl !== "string" || !paymentUrl.startsWith("http")) {
    throw new AppError("The payment gateway did not return a checkout URL.", 502);
  }

  return {
    paymentUrl,
    invoiceId: typeof invoiceId === "string" ? invoiceId : null,
  };
}

export async function verifyCharge(invoiceId: string): Promise<UddoktaVerifyResult> {
  const data = await gatewayFetch("/verify-payment", { invoice_id: invoiceId });
  const rawStatus = String(data.status ?? "UNKNOWN").toUpperCase();
  const status =
    rawStatus === "COMPLETED" || rawStatus === "PENDING" || rawStatus === "ERROR"
      ? rawStatus
      : "UNKNOWN";

  return {
    status,
    amount: Number.parseFloat(String(data.amount ?? "0")) || 0,
    invoiceId: typeof data.invoice_id === "string" ? data.invoice_id : null,
    transactionId: typeof data.transaction_id === "string" ? data.transaction_id : null,
    paymentMethod: typeof data.payment_method === "string" ? data.payment_method : null,
    senderNumber: typeof data.sender_number === "string" ? data.sender_number : null,
    metadata:
      data.metadata && typeof data.metadata === "object"
        ? (data.metadata as Record<string, unknown>)
        : {},
    raw: data,
    message: typeof data.message === "string" ? data.message : undefined,
  };
}

export async function refundCharge(input: {
  transactionId: string;
  paymentMethod: string;
  amount: number;
  productName: string;
  reason: string;
}) {
  const data = await gatewayFetch("/refund-payment", {
    transaction_id: input.transactionId,
    payment_method: input.paymentMethod,
    amount: input.amount.toFixed(2),
    product_name: input.productName,
    reason: input.reason,
  });

  return {
    ok: true,
    reference:
      (typeof data.refund_id === "string" && data.refund_id) ||
      (typeof data.transaction_id === "string" && data.transaction_id) ||
      null,
    raw: data,
  };
}
