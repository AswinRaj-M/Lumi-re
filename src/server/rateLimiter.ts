import { NextRequest } from "next/server";

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// In-memory sliding rate limit store
const ipStores = new Map<string, Map<string, RateLimitRecord>>();

// Periodic cleanup of stale rate-limit entries every 5 minutes
if (typeof setInterval !== "undefined") {
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [, store] of ipStores.entries()) {
      for (const [key, record] of store.entries()) {
        if (now > record.resetAt) {
          store.delete(key);
        }
      }
    }
  }, 5 * 60 * 1000);

  // Prevent keeping process alive just for rate limit cleanup if unref exists
  if (cleanupTimer && typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
    (cleanupTimer as { unref: () => void }).unref();
  }
}

/**
 * Extracts client IP from standard proxy headers or fallback.
 */
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();

  return "127.0.0.1";
}

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests allowed per window
}

const LIMIT_PROFILES: Record<string, RateLimitOptions> = {
  upload: { windowMs: 60 * 1000, maxRequests: 25 }, // 25 uploads per minute
  mutate: { windowMs: 60 * 1000, maxRequests: 60 }, // 60 mutative actions per minute
  read: { windowMs: 60 * 1000, maxRequests: 200 }, // 200 reads per minute
};

export interface RateLimitCheckResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetInSeconds: number;
}

/**
 * Checks whether an incoming request exceeds rate limits.
 */
export function checkRateLimit(
  req: NextRequest,
  profile: "upload" | "mutate" | "read"
): RateLimitCheckResult {
  const ip = getClientIp(req);
  const options = LIMIT_PROFILES[profile] || { windowMs: 60 * 1000, maxRequests: 60 };

  if (!ipStores.has(profile)) {
    ipStores.set(profile, new Map<string, RateLimitRecord>());
  }

  const store = ipStores.get(profile)!;
  const now = Date.now();
  const existing = store.get(ip);

  if (!existing || now > existing.resetAt) {
    // New window
    store.set(ip, {
      count: 1,
      resetAt: now + options.windowMs,
    });

    return {
      allowed: true,
      limit: options.maxRequests,
      remaining: options.maxRequests - 1,
      resetInSeconds: Math.ceil(options.windowMs / 1000),
    };
  }

  // Existing window
  existing.count += 1;
  const remaining = Math.max(0, options.maxRequests - existing.count);
  const resetInSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));

  if (existing.count > options.maxRequests) {
    return {
      allowed: false,
      limit: options.maxRequests,
      remaining: 0,
      resetInSeconds,
    };
  }

  return {
    allowed: true,
    limit: options.maxRequests,
    remaining,
    resetInSeconds,
  };
}
