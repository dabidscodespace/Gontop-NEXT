import { NextResponse } from "next/server";

import { jsonError, readJson } from "@/lib/api";
import { createSession, setSessionCookie } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { loginUser } from "@/lib/services/auth";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    const body = await readJson(request);
    const input = loginSchema.parse(body);
    const limited = rateLimit(`login:${ip}:${input.email}`, 10, 15 * 60 * 1000);
    if (!limited.ok) {
      return NextResponse.json(
        { ok: false, error: "Too many sign-in attempts. Please wait a few minutes." },
        { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
      );
    }

    const user = await loginUser(input);
    const token = await createSession({ userId: user.id });
    await setSessionCookie(token);

    return NextResponse.json({ ok: true, user });
  } catch (error) {
    return jsonError(error);
  }
}
