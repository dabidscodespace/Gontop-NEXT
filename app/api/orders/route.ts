import { NextResponse } from "next/server";

import { jsonError, readJson } from "@/lib/api";
import { assertSameOrigin, requireUser } from "@/lib/auth";
import { checkoutSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { cancelUnpaidOrder, createOrder } from "@/lib/services/orders";
import { initOrderGatewayPayment } from "@/lib/services/payments";

export async function POST(request: Request) {
  try {
    await assertSameOrigin(request);
    const user = await requireUser();

    const limited = rateLimit(`order:${user.id}`, 10, 60 * 1000);
    if (!limited.ok) {
      return NextResponse.json(
        { ok: false, error: "You are placing orders too quickly. Please wait a moment." },
        { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
      );
    }

    const input = checkoutSchema.parse(await readJson(request));
    const order = await createOrder(user.id, input);

    if (order.gatewayPortion > 0) {
      try {
        const payment = await initOrderGatewayPayment(order.orderId, user.id);
        return NextResponse.json({
          ok: true,
          publicId: order.publicId,
          status: order.status,
          paymentUrl: payment.paymentUrl,
          invoiceId: payment.invoiceId,
        });
      } catch (error) {
        await cancelUnpaidOrder(
          order.orderId,
          "Payment could not be started. Any wallet amount was returned.",
        ).catch((cancelError) => console.error("[orders] cancel after init failure:", cancelError));
        throw error;
      }
    }

    return NextResponse.json({
      ok: true,
      publicId: order.publicId,
      status: order.status,
      paymentUrl: null,
    });
  } catch (error) {
    return jsonError(error);
  }
}
