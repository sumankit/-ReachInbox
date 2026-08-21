import { redisConnection } from "../lib/redis";

/**
 * Per-sender, hour-windowed rate limiting backed by Redis so it's safe
 * across multiple worker processes/instances (no in-memory counters).
 *
 * Key shape: rl:{senderId}:{YYYYMMDDHH}
 * We INCR the bucket for "now"; if the result exceeds the sender's cap,
 * the send is rejected and the caller is told when the next window opens.
 */

function hourBucket(date: Date): string {
  return (
    date.getUTCFullYear().toString() +
    String(date.getUTCMonth() + 1).padStart(2, "0") +
    String(date.getUTCDate()).padStart(2, "0") +
    String(date.getUTCHours()).padStart(2, "0")
  );
}

function startOfNextHour(date: Date): Date {
  const next = new Date(date);
  next.setUTCMinutes(0, 0, 0);
  next.setUTCHours(next.getUTCHours() + 1);
  return next;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Only set when allowed === false: the timestamp the job should be retried at. */
  retryAt?: Date;
}

/**
 * Atomically reserves one "send" for this sender in the current hour
 * window. Uses INCR (atomic in Redis) so concurrent workers never
 * over-count. If this reservation pushes the sender over their cap, it is
 * immediately rolled back (DECR) and the call reports "not allowed".
 */
export async function reserveSendSlot(
  senderId: string,
  hourlyLimit: number,
  now: Date = new Date()
): Promise<RateLimitResult> {
  const key = `rl:${senderId}:${hourBucket(now)}`;
  const count = await redisConnection.incr(key);
  if (count === 1) {
    // First increment in this window: set expiry so old buckets don't leak.
    await redisConnection.expire(key, 2 * 60 * 60);
  }

  if (count > hourlyLimit) {
    await redisConnection.decr(key);
    return { allowed: false, retryAt: startOfNextHour(now) };
  }

  return { allowed: true };
}
