import "server-only";

import { cache } from "react";
import { cookies, headers } from "next/headers";
import { and, desc, eq, gt, isNotNull, lt } from "drizzle-orm";

import { adminUsers, auditLogs, sessions, users } from "@/db/schema";
import {
  ADMIN_SESSION_COOKIE,
  SESSION_COOKIE,
  SESSION_TTL_DAYS,
  createSessionToken,
  hashToken,
  newId,
  sessionExpiry,
} from "@/lib/crypto";
import { getDb } from "@/lib/db";
import { AppError } from "@/lib/money";
import { hasPermission, type Permission } from "@/lib/permissions";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  phone: string;
  picture: string | null;
  createdAt: Date;
};

export type SessionAdmin = {
  id: string;
  email: string;
  name: string;
  role: "owner" | "moderator";
  permissions: string[];
};

export type SessionInfo = {
  sessionId: string | null;
  user: SessionUser | null;
  admin: SessionAdmin | null;
};

/** Customers and staff keep separate cookies so both can be signed in at once. */
export type SessionScope = "user" | "admin";

const EMPTY: SessionInfo = { sessionId: null, user: null, admin: null };
const ARENA_PREVIEW_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

type PreviewFingerprint = { ip: string; userAgent: string };

function cookieName(scope: SessionScope) {
  return scope === "admin" ? ADMIN_SESSION_COOKIE : SESSION_COOKIE;
}

async function arenaPreviewFingerprint(): Promise<PreviewFingerprint | null> {
  // Arena's embedded preview may reject third-party cookies even when CHIPS is
  // requested. This fallback is opt-in for the isolated review server only.
  if (process.env.ARENA_PREVIEW !== "1") return null;

  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim().toLowerCase();
  const requestHost = forwardedHost ?? requestHeaders.get("host")?.toLowerCase() ?? "";
  if (requestHost !== "e2b.app" && !requestHost.endsWith(".e2b.app")) return null;

  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  const userAgent = requestHeaders.get("user-agent")?.slice(0, 255);
  if (!ip || !userAgent) return null;
  return { ip, userAgent };
}

async function readAdminSession(tokenHash: string): Promise<SessionInfo | null> {
  const db = await getDb();
  const rows = await db
    .select({
      sessionId: sessions.id,
      id: adminUsers.id,
      email: adminUsers.email,
      name: adminUsers.name,
      role: adminUsers.role,
      permissions: adminUsers.permissions,
      isActive: adminUsers.isActive,
    })
    .from(sessions)
    .innerJoin(adminUsers, eq(sessions.adminId, adminUsers.id))
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date())))
    .limit(1);

  const admin = rows[0];
  if (!admin || !admin.isActive) return null;
  return {
    sessionId: admin.sessionId,
    user: null,
    admin: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      permissions: admin.permissions,
    },
  };
}

async function readArenaPreviewAdminSession(
  fingerprint: PreviewFingerprint,
): Promise<SessionInfo | null> {
  const db = await getDb();
  const recentCutoff = new Date(Date.now() - ARENA_PREVIEW_SESSION_TTL_MS);
  const rows = await db
    .select({
      sessionId: sessions.id,
      id: adminUsers.id,
      email: adminUsers.email,
      name: adminUsers.name,
      role: adminUsers.role,
      permissions: adminUsers.permissions,
      isActive: adminUsers.isActive,
    })
    .from(sessions)
    .innerJoin(adminUsers, eq(sessions.adminId, adminUsers.id))
    .where(
      and(
        eq(sessions.ip, fingerprint.ip),
        eq(sessions.userAgent, fingerprint.userAgent),
        gt(sessions.createdAt, recentCutoff),
        gt(sessions.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(sessions.createdAt))
    .limit(1);

  const admin = rows[0];
  if (!admin || !admin.isActive) return null;
  return {
    sessionId: admin.sessionId,
    user: null,
    admin: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      permissions: admin.permissions,
    },
  };
}

async function readUserSession(tokenHash: string): Promise<SessionInfo | null> {
  const db = await getDb();
  const rows = await db
    .select({
      sessionId: sessions.id,
      id: users.id,
      email: users.email,
      name: users.name,
      phone: users.phone,
      picture: users.picture,
      createdAt: users.createdAt,
      isActive: users.isActive,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date())))
    .limit(1);

  const user = rows[0];
  if (!user || !user.isActive) return null;
  return {
    sessionId: user.sessionId,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      picture: user.picture,
      createdAt: user.createdAt,
    },
    admin: null,
  };
}

export const getSession = cache(async (): Promise<SessionInfo> => {
  const jar = await cookies();
  const adminToken = jar.get(ADMIN_SESSION_COOKIE)?.value;
  const userToken = jar.get(SESSION_COOKIE)?.value;

  // A token only matches a session of its own kind (admin rows have no userId and vice versa).
  let admin = adminToken ? await readAdminSession(hashToken(adminToken)) : null;
  const user = userToken ? await readUserSession(hashToken(userToken)) : null;

  // The Arena preview runs in a cross-site iframe where the browser can discard
  // even partitioned cookies. In that explicitly opted-in environment, bind a
  // recent admin session to the exact forwarded IP + browser user agent.
  if (!admin) {
    const fingerprint = await arenaPreviewFingerprint();
    if (fingerprint) admin = await readArenaPreviewAdminSession(fingerprint);
  }

  if (!admin && !user) return EMPTY;
  return {
    sessionId: admin?.sessionId ?? user?.sessionId ?? null,
    user: user?.user ?? null,
    admin: admin?.admin ?? null,
  };
});

export async function requireUser(): Promise<SessionUser> {
  const { user } = await getSession();
  if (!user) throw new AppError("Please log in to continue.", 401);
  return user;
}

export async function requireAdmin(permission?: Permission): Promise<SessionAdmin> {
  const { admin } = await getSession();
  if (!admin) throw new AppError("Admin authentication required.", 401);
  if (permission && !hasPermission(admin, permission)) {
    throw new AppError("You do not have permission to perform this action.", 403);
  }
  return admin;
}

export async function createSession(input: { userId?: string; adminId?: string }) {
  const h = await headers();
  const token = createSessionToken();
  const db = await getDb();

  await db.insert(sessions).values({
    id: newId(),
    tokenHash: hashToken(token),
    userId: input.userId ?? null,
    adminId: input.adminId ?? null,
    expiresAt: sessionExpiry(),
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: h.get("user-agent")?.slice(0, 255) ?? null,
  });

  // Opportunistic cleanup of expired sessions.
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));

  return token;
}

async function sessionCookieSecurity() {
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim().toLowerCase();
  const requestHost = forwardedHost ?? requestHeaders.get("host")?.toLowerCase() ?? "";
  const previewFrame =
    (process.env.NODE_ENV === "development" || process.env.ARENA_PREVIEW === "1") &&
    (requestHost === "e2b.app" || requestHost.endsWith(".e2b.app"));
  const forwardedHttps = requestHeaders
    .get("x-forwarded-proto")
    ?.split(",")
    .some((value) => value.trim().toLowerCase() === "https");
  const configuredHttps = (process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("https://");

  return {
    secure: previewFrame || forwardedHttps || configuredHttps,
    sameSite: previewFrame ? ("none" as const) : ("lax" as const),
    partitioned: previewFrame,
  };
}

export async function setSessionCookie(token: string, scope: SessionScope = "user") {
  const [jar, security] = await Promise.all([cookies(), sessionCookieSecurity()]);
  jar.set(cookieName(scope), token, {
    httpOnly: true,
    // Arena renders its HTTPS preview in a cross-site frame. `SameSite=None`
    // plus CHIPS keeps the preview session available when third-party cookies
    // are restricted; normal local and production sessions retain Lax cookies.
    ...security,
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  });
}

/** Ends only the session of the given scope; the other panel stays signed in. */
export async function destroySession(scope: SessionScope = "user") {
  const [jar, security, previewFingerprint] = await Promise.all([
    cookies(),
    sessionCookieSecurity(),
    scope === "admin" ? arenaPreviewFingerprint() : Promise.resolve(null),
  ]);
  const token = jar.get(cookieName(scope))?.value;
  const db = token || previewFingerprint ? await getDb() : null;
  if (token && db) {
    await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  }
  if (previewFingerprint && db) {
    const recentCutoff = new Date(Date.now() - ARENA_PREVIEW_SESSION_TTL_MS);
    await db
      .delete(sessions)
      .where(
        and(
          eq(sessions.ip, previewFingerprint.ip),
          eq(sessions.userAgent, previewFingerprint.userAgent),
          isNotNull(sessions.adminId),
          gt(sessions.createdAt, recentCutoff),
        ),
      );
  }
  jar.set(cookieName(scope), "", {
    httpOnly: true,
    ...security,
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
}

export async function audit(
  adminId: string | null,
  action: string,
  entity: string,
  entityId: string | number = "",
  details?: Record<string, unknown>,
) {
  const db = await getDb();
  const h = await headers();
  await db.insert(auditLogs).values({
    id: newId(),
    adminId,
    action,
    entity,
    entityId: String(entityId),
    details,
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
  });
}

/** Reject cross-site mutation attempts for cookie-authenticated API routes. */
export async function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return; // same-origin form posts may omit Origin

  const host = request.headers.get("host");
  const allowed = new Set(
    [
      process.env.NEXT_PUBLIC_SITE_URL,
      host ? `https://${host}` : null,
      host ? `http://${host}` : null,
    ].filter(Boolean),
  );

  if (!allowed.has(origin)) {
    throw new AppError("Cross-site request blocked.", 403);
  }
}
