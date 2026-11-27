import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { jsonError } from "@/lib/api";
import { assertSameOrigin, requireUser } from "@/lib/auth";
import { orders } from "@/db/schema";
import { getDb } from "@/lib/db";
import { AppError } from "@/lib/money";
import { initOrderGatewayPayment } from "@/lib/services/payments";

export async function POST(
  request: Request,
  context: { params: Promise<{ publicId: string }> },
) {
  try {
    await assertSameOrigin(request);
    const user = await requireUser();
    const { publicId } = await context.params;

    const db = await getDb();
    const rows = await db
      .select({ id: orders.id, userId: orders.userId, status: orders.status })
      .from(orders)
      .where(eq(orders.publicId, publicId))
      .limit(1);

    const order = rows[0];
    if (!order || order.userId !== user.id) throw new AppError("Order not found.", 404);

    const payment = await initOrderGatewayPayment(order.id, user.id);
    return NextResponse.json({ ok: true, paymentUrl: payment.paymentUrl });
  } catch (error) {
    return jsonError(error);
  }
}
