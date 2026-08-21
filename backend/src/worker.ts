import { Worker, Job } from "bullmq";
import { redisConnection } from "./lib/redis";
import { EMAIL_QUEUE_NAME, enqueueEmailJob } from "./lib/queue";
import { config } from "./config";
import { prisma } from "./lib/db";
import { reserveSendSlot } from "./services/rateLimiter";
import { sendEmail } from "./services/mailer";
import { reconcileScheduledJobs } from "./services/reconcile";

async function processEmailJob(job: Job<{ emailJobId: string }>) {
  const { emailJobId } = job.data;

  // --- Idempotency guard ---
  // Conditional update: only the worker that wins this WHERE clause gets to
  // send. Any concurrent/duplicate delivery of the same job (e.g. after a
  // crash + BullMQ retry, or two worker instances racing) sees 0 rows
  // affected and simply skips.
  const claim = await prisma.emailJob.updateMany({
    where: { id: emailJobId, status: "SCHEDULED" },
    data: { status: "PROCESSING" },
  });
  if (claim.count === 0) {
    return; // already handled (sent/failed/claimed elsewhere)
  }

  const emailJob = await prisma.emailJob.findUniqueOrThrow({
    where: { id: emailJobId },
    include: { sender: true, campaign: true },
  });

  // --- Per-sender hourly rate limit (Redis-backed, safe across workers) ---
  const rate = await reserveSendSlot(emailJob.senderId, emailJob.campaign.hourlyLimit);
  if (!rate.allowed) {
    // Don't drop or fail the job: push it to the next available hour
    // window and re-delay it in BullMQ, preserving its place in line.
    await prisma.emailJob.update({
      where: { id: emailJob.id },
      data: { status: "SCHEDULED", scheduledAt: rate.retryAt! },
    });
    await enqueueEmailJob({ emailJobId: emailJob.id, scheduledAt: rate.retryAt! });
    return;
  }

  try {
    await sendEmail({
      sender: emailJob.sender,
      to: emailJob.recipient,
      subject: emailJob.subject,
      body: emailJob.body,
    });
    await prisma.emailJob.update({
      where: { id: emailJob.id },
      data: { status: "SENT", sentAt: new Date(), error: null },
    });
  } catch (err) {
    await prisma.emailJob.update({
      where: { id: emailJob.id },
      data: { status: "FAILED", error: (err as Error).message },
    });
    throw err; // let BullMQ's retry/backoff policy also apply
  }
}

const worker = new Worker(EMAIL_QUEUE_NAME, processEmailJob, {
  connection: redisConnection,
  concurrency: config.workerConcurrency,
  // Global minimum delay between any two sends this worker processes,
  // regardless of sender (mimics real provider throttling).
  limiter: {
    max: 1,
    duration: config.minDelayBetweenEmailsMs,
  },
});

worker.on("completed", (job) => console.log(`[worker] sent job ${job.id}`));
worker.on("failed", (job, err) => console.error(`[worker] job ${job?.id} failed:`, err.message));

reconcileScheduledJobs().then((n) => {
  if (n > 0) console.log(`[worker boot] Re-enqueued ${n} scheduled job(s) after restart.`);
});

console.log(
  `Worker started. concurrency=${config.workerConcurrency} minDelayMs=${config.minDelayBetweenEmailsMs}`
);
