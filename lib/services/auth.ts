import "server-only";

import { eq, sql } from "drizzle-orm";

import { users, wallets } from "@/db/schema";
import { hashPassword, newId, verifyPassword } from "@/lib/crypto";
import { getDb } from "@/lib/db";
import { AppError } from "@/lib/money";
import type { loginSchema, registerSchema } from "@/lib/validation";
import type { z } from "zod";

async function findUserByEmail(email: string) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${email.trim().toLowerCase()}`)
    .limit(1);
  return rows[0] ?? null;
}

export async function registerUser(input: z.infer<typeof registerSchema>) {
  const email = input.email.trim().toLowerCase();
  const existing = await findUserByEmail(email);
  if (existing) {
    throw new AppError(
      existing.passwordHash
        ? "An account with this email already exists. Please sign in."
        : "This email is linked to a Google account. Please continue with Google.",
      409,
    );
  }

  const db = await getDb();
  const userId = newId();

  await db.transaction(async (tx) => {
    await tx.insert(users).values({
      id: userId,
      email,
      name: input.name.trim(),
      phone: input.phone?.trim() ?? "",
      passwordHash: hashPassword(input.password),
    });
    await tx.insert(wallets).values({ userId, balance: "0" }).onConflictDoNothing();
  });

  return { id: userId, email, name: input.name.trim() };
}

export async function loginUser(input: z.infer<typeof loginSchema>) {
  const user = await findUserByEmail(input.email);
  if (!user || !verifyPassword(input.password, user.passwordHash)) {
    throw new AppError("Invalid email or password.", 401);
  }
  if (!user.isActive) {
    throw new AppError("This account has been disabled. Please contact support.", 403);
  }

  return { id: user.id, email: user.email, name: user.name };
}

type GoogleTokenInfo = {
  aud?: string;
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  picture?: string;
  sub?: string;
};

/**
 * Verifies a Google ID token server-side with Google before creating a session.
 * This keeps existing Google-based customers working without WordPress.
 */
export async function loginWithGoogle(credential: string) {
  const expectedAudience = process.env.GOOGLE_CLIENT_ID ?? process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!expectedAudience) {
    throw new AppError("Google sign-in is not configured.", 503);
  }

  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
    { cache: "no-store" },
  );

  if (!response.ok) throw new AppError("Google sign-in failed. Please try again.", 401);

  const info = (await response.json()) as GoogleTokenInfo;
  const verified = info.email_verified === true || info.email_verified === "true";
  if (!info.email || !verified || info.aud !== expectedAudience) {
    throw new AppError("Google sign-in could not be verified.", 401);
  }

  const email = info.email.toLowerCase();
  const existing = await findUserByEmail(email);
  const db = await getDb();

  if (existing) {
    if (!existing.isActive) throw new AppError("This account has been disabled.", 403);
    await db
      .update(users)
      .set({
        googleId: info.sub ?? existing.googleId,
        picture: info.picture ?? existing.picture,
        name: existing.name || info.name || "",
        updatedAt: new Date(),
      })
      .where(eq(users.id, existing.id));
    return { id: existing.id, email: existing.email, name: existing.name || info.name || "" };
  }

  const userId = newId();
  await db.transaction(async (tx) => {
    await tx.insert(users).values({
      id: userId,
      email,
      name: info.name ?? "",
      picture: info.picture ?? null,
      googleId: info.sub ?? null,
    });
    await tx.insert(wallets).values({ userId, balance: "0" }).onConflictDoNothing();
  });

  return { id: userId, email, name: info.name ?? "" };
}

export async function updateCustomerProfile(
  userId: string,
  input: { name: string; phone: string },
) {
  const db = await getDb();
  await db
    .update(users)
    .set({ name: input.name.trim(), phone: input.phone.trim(), updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function changeCustomerPassword(
  userId: string,
  input: { currentPassword: string; newPassword: string },
) {
  const db = await getDb();
  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const user = rows[0];
  if (!user) throw new AppError("Account not found.", 404);

  if (user.passwordHash && !verifyPassword(input.currentPassword, user.passwordHash)) {
    throw new AppError("Your current password is incorrect.", 401);
  }

  await db
    .update(users)
    .set({ passwordHash: hashPassword(input.newPassword), updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function findUserById(userId: string) {
  const db = await getDb();
  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return rows[0] ?? null;
}
