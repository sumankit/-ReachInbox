import { prisma } from "../lib/db";
async function main() {
  const jobs = await prisma.emailJob.findMany({
    where: { status: { in: ["SCHEDULED", "PROCESSING"] } },
    orderBy: { scheduledAt: "asc" },
    select: { id: true, recipient: true, subject: true, status: true, scheduledAt: true },
  });
  console.log(`Found ${jobs.length} pending job(s):`);
  for (const j of jobs) console.log(j.status, j.scheduledAt.toISOString(), j.recipient, j.subject, j.id);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
