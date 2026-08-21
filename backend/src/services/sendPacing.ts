import { redisConnection } from "../lib/redis";

/**
 * Enforces the minimum gap between ANY two sends, globally, across all
 * workers/campaigns — but unlike a fixed BullMQ queue-level limiter, the
 * gap here is per-job: it's the larger of the admin-configured hard floor
 * (MIN_DELAY_BETWEEN_EMAILS_MS) and that job's own campaign.delayMs.
 *
 * Why this exists: a static `Worker({ limiter })` throttles the whole
 * queue to one fixed cadence, so once there's any backlog (multiple
 * campaigns queued close together, or a burst of retries), every job
 * drains at that one fixed pace regardless of what delay its own campaign
 * asked for — a campaign configured for a bigger gap than the floor would
 * silently get compressed down to the floor's cadence. Tracking the last
 * global send timestamp in Redis and checking it per-job fixes that: the
 * floor is still always enforced (never faster than the admin minimum),
 * but a campaign's own larger delay is honored too, even under load.
 */

const LAST_SEND_KEY = "pacing:last_send_at";

// Atomic check-and-set: only claims the slot if the gap has actually
// elapsed, so concurrent workers can't both "pass" for the same slot.
const CLAIM_SCRIPT = `
local last = tonumber(redis.call('GET', KEYS[1]) or '0')
local now = tonumber(ARGV[1])
local gap = tonumber(ARGV[2])
if now - last >= gap then
  redis.call('SET', KEYS[1], now, 'PX', 3600000)
  return 1
else
  return last + gap
end
`;

export interface PacingResult {
  allowed: boolean;
  /** Only set when allowed === false: the timestamp this send is next eligible at. */
  retryAt?: Date;
}

export async function reserveSendTiming(requiredGapMs: number): Promise<PacingResult> {
  const now = Date.now();
  const result = (await redisConnection.eval(
    CLAIM_SCRIPT,
    1,
    LAST_SEND_KEY,
    now,
    requiredGapMs
  )) as number;

  if (result === 1) return { allowed: true };
  return { allowed: false, retryAt: new Date(result) };
}
