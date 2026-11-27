import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";

import { verifyInvoice } from "@/lib/services/payments";

/**
 * UddoktaPay webhook. Authentication is the API key header; the payload's
 * status is ignored and the invoice is always re-verified with the gateway.
 */
export async function POST(request: Request) {
  const expected = process.env.UDDOKTAPAY_API_KEY?.trim();
  const provided = request.headers.get("rt-uddoktapay-api-key")?.trim();

  if (!expected || !provided) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const providedDigest = createHash("sha256").update(provided).digest();
  const expectedDigest = createHash("sha256").update(expected).digest();
  if (!timingSafeEqual(providedDigest, expectedDigest)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { invoice_id?: string };
    if (!body.invoice_id || typeof body.invoice_id !== "string") {
      return NextResponse.json({ ok: false, error: "invoice_id required" }, { status: 400 });
    }

    const result = await verifyInvoice(body.invoice_id, { isAdmin: true });
    return NextResponse.json({ ok: true, status: result.status });
  } catch (error) {
    console.error("[uddoktapay webhook]", error);
    // Returning 5xx asks the gateway to retry; verification is idempotent.
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
