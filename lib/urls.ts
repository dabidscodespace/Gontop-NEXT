import "server-only";

import { headers } from "next/headers";

/** Absolute URL for gateway redirects and webhooks. */
export async function absoluteUrl(pathname: string) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  if (configured) return `${configured}${pathname}`;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}${pathname}`;
}
