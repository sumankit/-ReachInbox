import { Queue } from "bullmq";
import { redisConnection } from "./redis";
import { config } from "../config";

export const EMAIL_QUEUE_NAME = "email-jobs";

// The GLOBAL minimum delay between any two sends (mimics provider throttling)
// is enforced via the Worker's `limiter` option in worker.ts. Per-sender
// hourly caps are enforced separately in the worker via Redis counters
// (see services/rateLimiter.ts) because BullMQ's limiter is queue-wide,
// not per-group, on the open-source version.
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
  // scheduling: calling this twice for the same EmailJob is a no-op.
  await emailQueue.add(
    "send-email",
    { emailJobId: params.emailJobId },
    { jobId: params.emailJobId, delay }
  );
}

export { config as queueConfig };
