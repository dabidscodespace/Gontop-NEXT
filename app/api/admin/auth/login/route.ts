import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";

import { jsonError, readJson } from "@/lib/api";
import { adminUsers } from "@/db/schema";
import { audit, createSession, setSessionCookie } from "@/lib/auth";
import { verifyPassword } from "@/lib/crypto";
import { getDb } from "@/lib/db";
import { AppError } from "@/lib/money";
import { rateLimit } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    const limited = rateLimit(`admin-login:${ip}`, 6, 15 * 60 * 1000);
    if (!limited.ok) {
      return NextResponse.json(
        { ok: false, error: "Too many attempts. Please wait 15 minutes." },
        { status: 429 },
      );
    }

    const input = loginSchema.parse(await readJson(request));
    const db = await getDb();
    const rows = await db
      .select()
      .from(adminUsers)
      .where(sql`lower(${adminUsers.email}) = ${input.email}`)
      .limit(1);

    const admin = rows[0];
    if (!admin || !verifyPassword(input.password, admin.passwordHash)) {
      throw new AppError("Invalid email or password.", 401);
    }
    if (!admin.isActive) throw new AppError("This admin account is disabled.", 403);

    const token = await createSession({ adminId: admin.id });
    await setSessionCookie(token, "admin");

    await db
      .update(adminUsers)
      .set({ lastLoginAt: new Date() })
      .where(eq(adminUsers.id, admin.id));
    await audit(admin.id, "admin.login", "admin", admin.id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
