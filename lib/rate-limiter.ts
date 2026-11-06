/**
 * RenewalDesk Serverless Rate Limiter
 * 
 * Shared distributed rate limiting designed for serverless runtimes.
 * Supports:
 *   1. Upstash Redis REST API (via UPSTASH_REDIS_REST_URL & UPSTASH_REDIS_REST_TOKEN)
 *   2. Supabase Database table fallback (rate_limit_entries via service role)
 *   3. Safe Fail-Open fallback with warning if store is unreachable,
 *      ensuring legitimate shop owners are never locked out due to network issues.
 */

import { getServiceRoleSupabaseClient } from './supabase/service-role';

export interface RateLimitOptions {
  key: string;            // e.g. `checkout:ip_1.2.3.4` or `trial:user_uuid`
  limit: number;          // maximum requests permitted in window
  windowSeconds: number;  // duration of window in seconds
}

export interface RateLimitResult {
  success: boolean;       // true if allowed, false if blocked (429)
  limit: number;
  remaining: number;
  resetAt: number;        // timestamp in ms
}

// In-memory test override for unit testing
let _memoryTestStore: Map<string, { count: number; resetAt: number }> | null = null;

export function enableMemoryRateLimitForTesting(enable: boolean = true) {
  _memoryTestStore = enable ? new Map() : null;
}

export function resetMemoryRateLimitStore() {
  if (_memoryTestStore) _memoryTestStore.clear();
}

/**
 * Checks rate limit against Upstash Redis via REST API
 */
async function checkUpstashRedis(
  url: string,
  token: string,
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult | null> {
  try {
    const prefixedKey = `rd_rate:${key}`;
    // Upstash pipeline: INCR then EXPIRE if 1
    const res = await fetch(`${url.replace(/\/$/, '')}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', prefixedKey],
        ['EXPIRE', prefixedKey, windowSeconds],
        ['TTL', prefixedKey],
      ]),
      cache: 'no-store',
    });

    if (!res.ok) {
      console.warn('Upstash rate limit request returned status:', res.status);
      return null;
    }

    const json = await res.json();
    const count = Number(json?.[0]?.result ?? 1);
    const ttl = Number(json?.[2]?.result ?? windowSeconds);
    const resetAt = Date.now() + ttl * 1000;

    return {
      success: count <= limit,
      limit,
      remaining: Math.max(0, limit - count),
      resetAt,
    };
  } catch (err) {
    console.warn('Failed connecting to Upstash Redis:', err);
    return null;
  }
}

/**
 * Checks rate limit against Supabase table `rate_limit_entries`
 */
async function checkSupabaseTable(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult | null> {
  try {
    const supabase = getServiceRoleSupabaseClient();
    const now = new Date();
    const nowMs = now.getTime();
    const prefixedKey = `rd_rate:${key}`;

    const { data: existing, error: selectErr } = await supabase
      .from('rate_limit_entries')
      .select('count, reset_at')
      .eq('key', prefixedKey)
      .maybeSingle();

    if (selectErr && !selectErr.message?.includes('does not exist')) {
      console.warn('Supabase rate limit query notice:', selectErr.message);
      return null;
    }

    if (!existing || new Date(existing.reset_at).getTime() <= nowMs) {
      // Create new window
      const newResetAt = new Date(nowMs + windowSeconds * 1000).toISOString();
      await supabase
        .from('rate_limit_entries')
        .upsert({
          key: prefixedKey,
          count: 1,
          reset_at: newResetAt,
        }, { onConflict: 'key' });

      return {
        success: true,
        limit,
        remaining: limit - 1,
        resetAt: nowMs + windowSeconds * 1000,
      };
    }

    const currentCount = Number(existing.count || 0) + 1;
    const resetAtMs = new Date(existing.reset_at).getTime();

    // Increment count
    await supabase
      .from('rate_limit_entries')
      .update({ count: currentCount })
      .eq('key', prefixedKey);

    return {
      success: currentCount <= limit,
      limit,
      remaining: Math.max(0, limit - currentCount),
      resetAt: resetAtMs,
    };
  } catch (err) {
    console.warn('Supabase rate limiter fallback failed:', err);
    return null;
  }
}

/**
 * Primary rate limiting entrypoint.
 * Fails open safely if external stores are unconfigured or unavailable.
 */
export async function checkRateLimit({
  key,
  limit,
  windowSeconds,
}: RateLimitOptions): Promise<RateLimitResult> {
  // 1. In-memory mode for fast deterministic unit tests
  if (_memoryTestStore) {
    const now = Date.now();
    const entry = _memoryTestStore.get(key);
    if (!entry || entry.resetAt <= now) {
      const resetAt = now + windowSeconds * 1000;
      _memoryTestStore.set(key, { count: 1, resetAt });
      return { success: true, limit, remaining: limit - 1, resetAt };
    }
    entry.count += 1;
    return {
      success: entry.count <= limit,
      limit,
      remaining: Math.max(0, limit - entry.count),
      resetAt: entry.resetAt,
    };
  }

  // 2. Upstash Redis (if configured via environment variables)
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (upstashUrl && upstashToken) {
    const redisResult = await checkUpstashRedis(upstashUrl, upstashToken, key, limit, windowSeconds);
    if (redisResult !== null) {
      return redisResult;
    }
  }

  // 3. Supabase Database rate_limit_entries table fallback
  const dbResult = await checkSupabaseTable(key, limit, windowSeconds);
  if (dbResult !== null) {
    return dbResult;
  }

  // 4. Fail-Open with warning (never block legitimate requests when store is down)
  console.warn(`[RateLimiter] Shared store unavailable for key "${key}". Failing open safely.`);
  return {
    success: true,
    limit,
    remaining: limit,
    resetAt: Date.now() + windowSeconds * 1000,
  };
}

/**
 * Extracts a client IP or fallback identifier from incoming HTTP request
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return '127.0.0.1';
}
