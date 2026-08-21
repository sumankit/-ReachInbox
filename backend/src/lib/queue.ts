import { Queue } from "bullmq";
import { redisConnection } from "./redis";
import { config } from "../config";

export const EMAIL_QUEUE_NAME = "email-jobs";

// Per-job send pacing (services/sendPacing.ts) and per-sender hourly caps
// (services/rateLimiter.ts) are both enforced with Redis-backed checks
// inside the worker itself, not via BullMQ's queue-level `limiter` — see
// worker.ts for why.
export const emailQueue = new Queue(EMAIL_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 1000,
    removeOnFail: 5000,
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
  },
});

export async function enqueueEmailJob(params: {
  emailJobId: string;
  scheduledAt: Date;
}) {
  const delay = Math.max(0, params.scheduledAt.getTime() - Date.now());
  // jobId = DB row id => BullMQ dedupes automatically, giving us idempotent
  // scheduling: calling this twice for the same EmailJob is a no-op. This
  // is only safe for the *initial* schedule / reconciliation path — see
  // rescheduleEmailJob for why a reschedule can't reuse this jobId.
  await emailQueue.add(
    "send-email",
    { emailJobId: params.emailJobId },
    { jobId: params.emailJobId, delay }
  );
}

/**
 * Re-enqueues a job that's being pushed back (hourly-limit overflow, or a
 * pacing conflict) — NOT the same as the initial enqueueEmailJob.
 *
 * BullMQ dedupes `add()` by jobId even against a job that already reached
 * a terminal state (completed/failed): once `jobId = emailJobId` has been
 * used and the job finished, calling `add()` with that same jobId again is
 * silently a no-op — no new delayed job is created. Since our reschedule
 * paths return early *without throwing* (so BullMQ marks the original
 * attempt "completed"), reusing enqueueEmailJob here would make the email
 * vanish: never sent, and reconcileScheduledJobs won't catch it either
 * because `queue.getJob(emailJobId)` still finds the old completed job.
 *
 * The fix: give every reschedule a fresh, unique BullMQ jobId. Idempotency
 * against double-sending is still fully guaranteed at the DB layer (the
 * conditional `status IN (SCHEDULED, FAILED)` claim in worker.ts) — the
 * BullMQ jobId is only ever a scheduling/dedup mechanism, not the source
 * of truth for "has this already been sent".
 */
export async function rescheduleEmailJob(params: {
  emailJobId: string;
  scheduledAt: Date;
}) {
  const delay = Math.max(0, params.scheduledAt.getTime() - Date.now());
  const jobId = `${params.emailJobId}:r${Date.now()}`;
  await emailQueue.add("send-email", { emailJobId: params.emailJobId }, { jobId, delay });
}

export { config as queueConfig };
