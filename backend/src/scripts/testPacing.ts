import { prisma } from "../lib/db";
import { enqueueEmailJob } from "../lib/queue";

async function main() {
  const senders = await prisma.sender.findMany({ orderBy: { createdAt: "asc" } });
  const campaign = await prisma.campaign.create({
    data: {
      userId: (await prisma.user.findFirstOrThrow()).id,
      subject: "pacing-test",
      body: "pacing test",
      startTime: new Date(),
      delayMs: 2000,
      hourlyLimit: 200,
    },
  });

  const recipients = ["pace1@example.com", "pace2@example.com", "pace3@example.com", "pace4@example.com", "pace5@example.com"];
  const now = new Date();
  for (let i = 0; i < recipients.length; i++) {
    const job = await prisma.emailJob.create({
      data: {
        campaignId: campaign.id,
        senderId: senders[i % senders.length].id,
        recipient: recipients[i],
        subject: "pacing-test",
        body: "pacing test",
        scheduledAt: now, // all "eligible" at once, to test the pacing gate under contention
      },
    });
    await enqueueEmailJob({ emailJobId: job.id, scheduledAt: now });
  }
  console.log(`Scheduled ${recipients.length} pacing-test jobs, all eligible now.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
