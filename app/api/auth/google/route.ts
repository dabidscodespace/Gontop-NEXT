import { NextResponse } from "next/server";

import { jsonError, readJson } from "@/lib/api";
import { createSession, setSessionCookie } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { loginWithGoogle } from "@/lib/services/auth";
import { AppError } from "@/lib/money";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    const limited = rateLimit(`google:${ip}`, 15, 15 * 60 * 1000);
    if (!limited.ok) {
      return NextResponse.json({ ok: false, error: "Too many attempts." }, { status: 429 });
    }

    const body = (await readJson(request)) as { credential?: string };
    if (!body.credential || typeof body.credential !== "string") {
      throw new AppError("Google credential is required.", 422);
    }

    const user = await loginWithGoogle(body.credential);
    const token = await createSession({ userId: user.id });
    await setSessionCookie(token);

    return NextResponse.json({ ok: true, user });
  } catch (error) {
    return jsonError(error);
  }
}
