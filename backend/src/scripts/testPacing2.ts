import { prisma } from "../lib/db";
import { enqueueEmailJob } from "../lib/queue";

async function main() {
  const senders = await prisma.sender.findMany({ orderBy: { createdAt: "asc" } });
  const campaign = await prisma.campaign.create({
    data: {
      userId: (await prisma.user.findFirstOrThrow()).id,
      subject: "pacing-test-2",
      body: "pacing test 2",
      startTime: new Date(),
      delayMs: 2000,
      hourlyLimit: 200,
    },
  });
  const recipients = ["p2a@example.com", "p2b@example.com", "p2c@example.com", "p2d@example.com", "p2e@example.com"];
  const now = new Date();
  for (let i = 0; i < recipients.length; i++) {
    const job = await prisma.emailJob.create({
      data: {
        campaignId: campaign.id,
        senderId: senders[i % senders.length].id,
        recipient: recipients[i],
        subject: "pacing-test-2",
        body: "pacing test 2",
        scheduledAt: now,
      },
    });
    await enqueueEmailJob({ emailJobId: job.id, scheduledAt: now });
  }
  console.log("done");
  await prisma.$disconnect();
}
main();
