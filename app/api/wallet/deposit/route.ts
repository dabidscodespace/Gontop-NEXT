import { NextResponse } from "next/server";

import { jsonError, readJson } from "@/lib/api";
import { assertSameOrigin, requireUser } from "@/lib/auth";
import { depositSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { initWalletDeposit } from "@/lib/services/payments";

export async function POST(request: Request) {
  try {
    await assertSameOrigin(request);
    const user = await requireUser();

    const limited = rateLimit(`deposit:${user.id}`, 6, 60 * 1000);
    if (!limited.ok) {
      return NextResponse.json({ ok: false, error: "Please wait before trying again." }, { status: 429 });
    }

    const { amount } = depositSchema.parse(await readJson(request));
    const result = await initWalletDeposit(user.id, amount);

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return jsonError(error);
  }
}
