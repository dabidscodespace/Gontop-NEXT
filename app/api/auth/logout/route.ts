import { NextResponse } from "next/server";

import { jsonError } from "@/lib/api";
import { assertSameOrigin, destroySession, type SessionScope } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    await assertSameOrigin(request);
    // Admin panel signs out with ?scope=admin so a customer session in the same browser stays active.
    const scope: SessionScope = new URL(request.url).searchParams.get("scope") === "admin" ? "admin" : "user";
    await destroySession(scope);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
