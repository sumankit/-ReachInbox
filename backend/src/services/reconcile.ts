import { prisma } from "../lib/db";
import { emailQueue, enqueueEmailJob } from "../lib/queue";

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
