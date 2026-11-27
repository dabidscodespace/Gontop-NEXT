import { NextResponse } from "next/server";

import { jsonError, readJson } from "@/lib/api";
import { assertSameOrigin, requireUser } from "@/lib/auth";
import { verifyInvoice } from "@/lib/services/payments";
import { AppError } from "@/lib/money";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    await assertSameOrigin(request);
    const user = await requireUser();

    const limited = rateLimit(`verify:${user.id}`, 20, 60 * 1000);
    if (!limited.ok) {
      return NextResponse.json({ ok: false, error: "Please wait before checking again." }, { status: 429 });
    }

    const body = (await readJson(request)) as { invoice_id?: string };
    if (!body.invoice_id || typeof body.invoice_id !== "string") {
      throw new AppError("Invoice id is required.", 422);
    }

    const result = await verifyInvoice(body.invoice_id, { userId: user.id });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return jsonError(error);
  }
}
