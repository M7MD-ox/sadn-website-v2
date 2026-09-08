/**
 * In-memory sliding-window rate limiter for serverless Next.js API routes.
 * Tracks requests by key (IP or identifier) to prevent spam and brute-force abuse.
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitRecord>();

// Clean up expired entries every 5 minutes to avoid memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      if (record.resetAt <= now) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

export interface RateLimitOptions {
  /** Maximum number of requests allowed in the window */
  max: number;
  /** Window duration in seconds */
  windowSeconds: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

/**
 * Check if the given key has exceeded the rate limit.
 */
export function checkRateLimit(
  key: string,
  options: RateLimitOptions
): RateLimitResult {
  const now = Date.now();
  const windowMs = options.windowSeconds * 1000;
  const record = store.get(key);

  if (!record || record.resetAt <= now) {
    // New or expired window
    const newRecord: RateLimitRecord = {
      count: 1,
      resetAt: now + windowMs,
    };
    store.set(key, newRecord);
    return {
      success: true,
      limit: options.max,
      remaining: options.max - 1,
      resetAt: newRecord.resetAt,
    };
  }

  // Existing active window
  if (record.count >= options.max) {
    return {
      success: false,
      limit: options.max,
      remaining: 0,
      resetAt: record.resetAt,
    };
  }

  record.count += 1;
  return {
    success: true,
    limit: options.max,
    remaining: options.max - record.count,
    resetAt: record.resetAt,
  };
}

/**
 * Helper to extract client IP from Next.js request headers.
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return '127.0.0.1';
}
