import { prisma } from "../lib/db";
import { emailQueue, enqueueEmailJob, rescheduleEmailJob } from "../lib/queue";

// If a job has been sitting in PROCESSING longer than this, the worker that
// claimed it almost certainly crashed/restarted mid-send rather than still
// genuinely being in flight — see recoverStuckProcessingJobs below.
const STUCK_PROCESSING_THRESHOLD_MS = 2 * 60 * 1000;

/**
 * Runs once on process boot (both API and worker processes call this).
 *
 * Why it's needed: BullMQ jobs live in Redis. The Postgres `EmailJob` row
 * is the source of truth. If Redis is ever wiped/restarted without its
 * persistence volume, or a job was created in the DB but the process
 * crashed before the `emailQueue.add` call completed, that email would
 * otherwise silently never send.
 *
 * This walks every DB row still in SCHEDULED status and makes sure a
 * matching BullMQ job exists (re-adding with the correct remaining delay,
 * or delay 0 if the original time already passed). Because BullMQ jobs are
 * added with jobId = EmailJob.id, this is idempotent: if the job is still
 * present in Redis, `add` is a safe no-op and nothing is duplicated.
 */
export async function reconcileScheduledJobs(): Promise<number> {
  const scheduled = await prisma.emailJob.findMany({
    where: { status: "SCHEDULED" },
    select: { id: true, scheduledAt: true },
  });

  let reEnqueued = 0;
  for (const job of scheduled) {
    const existing = await emailQueue.getJob(job.id);
    if (existing) continue; // already present in Redis, nothing to do

    await enqueueEmailJob({ emailJobId: job.id, scheduledAt: job.scheduledAt });
    reEnqueued += 1;
  }

  return reEnqueued;
}

/**
 * Recovers jobs stuck in PROCESSING: the worker's idempotency claim moves a
 * job SCHEDULED/FAILED -> PROCESSING right before sending, but if the
 * process crashes or is restarted between that claim and actually finishing
 * (sent/failed), nothing else is allowed to re-claim a PROCESSING row by
 * design (to avoid double-sending a genuinely in-flight email) — so it
 * would otherwise sit there forever. This treats any row that's been
 * PROCESSING for longer than a genuine send could plausibly take as an
 * orphaned crash artifact, resets it back to SCHEDULED, and re-enqueues it
 * with a fresh BullMQ jobId (same reasoning as rescheduleEmailJob).
 */
export async function recoverStuckProcessingJobs(): Promise<number> {
  const cutoff = new Date(Date.now() - STUCK_PROCESSING_THRESHOLD_MS);
  const stuck = await prisma.emailJob.findMany({
    where: { status: "PROCESSING", updatedAt: { lt: cutoff } },
    select: { id: true },
  });

  let recovered = 0;
  for (const job of stuck) {
    const now = new Date();
    const claim = await prisma.emailJob.updateMany({
      where: { id: job.id, status: "PROCESSING" },
      data: { status: "SCHEDULED", scheduledAt: now },
    });
    if (claim.count === 0) continue; // someone else already recovered/finished it

    await rescheduleEmailJob({ emailJobId: job.id, scheduledAt: now });
    recovered += 1;
  }

  return recovered;
}
