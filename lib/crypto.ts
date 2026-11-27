import "server-only";

import { randomBytes, randomUUID, scryptSync, timingSafeEqual, createHash } from "node:crypto";

const SCRYPT_KEYLEN = 64;

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function newId() {
  return randomUUID();
}

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string | null | undefined) {
  if (!stored) return false;
  const [scheme, salt, hash] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !hash) return false;

  const candidate = scryptSync(password, salt, SCRYPT_KEYLEN);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

export const SESSION_COOKIE = "gontop_session";
export const ADMIN_SESSION_COOKIE = "gontop_admin_session";
export const SESSION_TTL_DAYS = 30;

export function sessionExpiry() {
  return new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
}
