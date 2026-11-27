import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { jsonError } from "@/lib/api";
import { assertSameOrigin, requireUser } from "@/lib/auth";
import { orders } from "@/db/schema";
import { getDb } from "@/lib/db";
import { AppError } from "@/lib/money";
import { cancelUnpaidOrder } from "@/lib/services/orders";

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
    if (order.status !== "pending_payment") {
      throw new AppError("Only unpaid orders can be cancelled.", 409);
    }

    const updated = await cancelUnpaidOrder(order.id, "Cancelled by customer");
    return NextResponse.json({ ok: true, status: updated?.status ?? "cancelled" });
  } catch (error) {
    return jsonError(error);
  }
}
