import { NextResponse } from "next/server";

import { jsonError } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getOrderStatusForUser } from "@/lib/services/orders";
import { AppError } from "@/lib/money";

export async function GET(
  _request: Request,
  context: { params: Promise<{ publicId: string }> },
) {
  try {
    const user = await requireUser();
    const { publicId } = await context.params;
    const order = await getOrderStatusForUser(publicId, user.id);
    if (!order) throw new AppError("Order not found.", 404);

    return NextResponse.json(
      { ok: true, status: order.status, updatedAt: order.updatedAt },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return jsonError(error);
  }
}
