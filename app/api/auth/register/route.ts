import { NextResponse } from "next/server";

import { jsonError, readJson } from "@/lib/api";
import { createSession, setSessionCookie } from "@/lib/auth";
import { registerSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { registerUser } from "@/lib/services/auth";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    const limited = rateLimit(`register:${ip}`, 8, 15 * 60 * 1000);
    if (!limited.ok) {
      return NextResponse.json(
        { ok: false, error: "Too many attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
      );
    }

    const body = await readJson(request);
    const input = registerSchema.parse(body);
    const user = await registerUser(input);

    const token = await createSession({ userId: user.id });
    await setSessionCookie(token);

    return NextResponse.json({ ok: true, user });
  } catch (error) {
    return jsonError(error);
  }
}
