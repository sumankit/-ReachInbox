import { prisma } from "../lib/db";

async function main() {
  const jobs = await prisma.emailJob.findMany({
    where: { status: "SENT" },
    orderBy: { sentAt: "desc" },
    take: 10,
    select: { recipient: true, sentAt: true },
  });

  const sorted = jobs.reverse();
  let prev: Date | null = null;
  for (const j of sorted) {
    const gap = prev ? (j.sentAt!.getTime() - prev.getTime()) / 1000 : null;
    console.log(
      `${j.sentAt!.toISOString()}  ${j.recipient.padEnd(25)}  gap=${gap !== null ? gap + "s" : "-"}`
    );
    prev = j.sentAt!;
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
