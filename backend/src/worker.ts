import { Worker, Job } from "bullmq";
import { redisConnection } from "./lib/redis";
import { EMAIL_QUEUE_NAME, rescheduleEmailJob } from "./lib/queue";
import { config } from "./config";
import { prisma } from "./lib/db";
import { reserveSendSlot } from "./services/rateLimiter";
import { reserveSendTiming } from "./services/sendPacing";
import { sendEmail } from "./services/mailer";
import { reconcileScheduledJobs } from "./services/reconcile";

async function processEmailJob(job: Job<{ emailJobId: string }>) {
  const { emailJobId } = job.data;

  // --- Idempotency guard ---
  // Conditional update: only the worker that wins this WHERE clause gets to
  // send. Any concurrent/duplicate delivery of the same job (e.g. after a
  // crash + BullMQ retry, or two worker instances racing) sees 0 rows
  // affected and simply skips. FAILED is included alongside SCHEDULED so a
  // BullMQ retry (attempts > 1) can actually re-attempt a send that failed
  // last time, instead of silently no-op'ing forever.
  const claim = await prisma.emailJob.updateMany({
    where: { id: emailJobId, status: { in: ["SCHEDULED", "FAILED"] } },
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
    await rescheduleEmailJob({ emailJobId: emailJob.id, scheduledAt: rate.retryAt! });
    return;
  }

  // --- Per-job send pacing (Redis-backed, safe across workers) ---
  // Enforces the LARGER of the admin floor (MIN_DELAY_BETWEEN_EMAILS_MS)
  // and this job's own campaign.delayMs — so a campaign's configured delay
  // is actually honored even under backlog, instead of every job draining
  // at one fixed global cadence (see services/sendPacing.ts).
  const requiredGap = Math.max(config.minDelayBetweenEmailsMs, emailJob.campaign.delayMs);
  const pacing = await reserveSendTiming(requiredGap);
  if (!pacing.allowed) {
    await prisma.emailJob.update({
      where: { id: emailJob.id },
      data: { status: "SCHEDULED", scheduledAt: pacing.retryAt! },
    });
    await rescheduleEmailJob({ emailJobId: emailJob.id, scheduledAt: pacing.retryAt! });
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

// Note: no static `limiter` here on purpose — that would force every job
// through one fixed global cadence. Pacing is instead enforced per-job
// above via reserveSendTiming, which respects each campaign's own delay
// (while never going below the MIN_DELAY_BETWEEN_EMAILS_MS floor).
const worker = new Worker(EMAIL_QUEUE_NAME, processEmailJob, {
  connection: redisConnection,
  concurrency: config.workerConcurrency,
});

worker.on("completed", (job) =>
  console.log(`[worker] ${new Date().toISOString()} sent job ${job.id}`)
);
worker.on("failed", (job, err) =>
  console.error(`[worker] ${new Date().toISOString()} job ${job?.id} failed:`, err.message)
);

reconcileScheduledJobs().then((n) => {
  if (n > 0) console.log(`[worker boot] Re-enqueued ${n} scheduled job(s) after restart.`);
});

console.log(
  `Worker started. concurrency=${config.workerConcurrency} minDelayMs=${config.minDelayBetweenEmailsMs}`
);
