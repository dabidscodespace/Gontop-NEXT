import { NextResponse } from "next/server";
import { and, desc, eq, inArray } from "drizzle-orm";

import { jsonError } from "@/lib/api";
import { assertSameOrigin, requireUser } from "@/lib/auth";
import { orders, payments } from "@/db/schema";
import { getDb } from "@/lib/db";
import { AppError } from "@/lib/money";
import { verifyInvoice } from "@/lib/services/payments";

export async function POST(
  request: Request,
  context: { params: Promise<{ publicId: string }> },
) {
  try {
    await assertSameOrigin(request);
    const user = await requireUser();
    const { publicId } = await context.params;

    const db = await getDb();
    const orderRows = await db
      .select({ id: orders.id, userId: orders.userId, status: orders.status })
      .from(orders)
      .where(eq(orders.publicId, publicId))
      .limit(1);

    const order = orderRows[0];
    if (!order || order.userId !== user.id) throw new AppError("Order not found.", 404);

    const paymentRows = await db
      .select({ invoiceId: payments.invoiceId })
      .from(payments)
      .where(
        and(
          eq(payments.orderId, order.id),
          eq(payments.type, "order"),
          inArray(payments.status, ["initiated", "pending"]),
        ),
      )
      .orderBy(desc(payments.createdAt))
      .limit(1);

    const invoiceId = paymentRows[0]?.invoiceId;
    if (!invoiceId) {
      return NextResponse.json({
        ok: true,
        status: order.status,
        message: "No pending gateway payment was found for this order.",
      });
    }

    const result = await verifyInvoice(invoiceId, { userId: user.id });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return jsonError(error);
  }
}
