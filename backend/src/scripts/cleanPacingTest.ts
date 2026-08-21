import { prisma } from "../lib/db";

async function main() {
  const campaigns = await prisma.campaign.findMany({
    where: { subject: { in: ["pacing-test", "pacing-test-2"] } },
    select: { id: true },
  });
  const ids = campaigns.map((c) => c.id);
  const jobs = await prisma.emailJob.deleteMany({ where: { campaignId: { in: ids } } });
  const camps = await prisma.campaign.deleteMany({ where: { id: { in: ids } } });
  console.log(`Deleted ${jobs.count} jobs, ${camps.count} campaigns.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
