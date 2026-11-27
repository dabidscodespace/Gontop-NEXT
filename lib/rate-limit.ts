type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/**
 * Small fixed-window limiter. In-memory by design: on a single VPS it protects
 * the whole app; on serverless it protects each instance. Sensitive flows also
 * have database-level idempotency guards, so this is a first line of defence.
 */
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfter: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfter: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  return { ok: true, remaining: limit - bucket.count, retryAfter: 0 };
}

export function resetRateLimit(key: string) {
  buckets.delete(key);
}

if (buckets.size === 0) {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }, 60_000).unref?.();
}
