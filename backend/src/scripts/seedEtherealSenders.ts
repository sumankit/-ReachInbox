import nodemailer from "nodemailer";
import { prisma } from "../lib/db";

/**
 * Creates N fresh Ethereal (https://ethereal.email) test SMTP accounts and
 * stores them as `Sender` rows, so the app has multiple real senders to
 * round-robin across without you having to sign up manually.
 *
 * Usage: npm run seed:senders           (creates 3 senders)
 *        npm run seed:senders -- 5      (creates 5 senders)
 */
async function main() {
  const count = Number(process.argv[2] ?? 3);

  for (let i = 0; i < count; i++) {
    const account = await nodemailer.createTestAccount();
    const sender = await prisma.sender.create({
      data: {
        name: `Sender ${i + 1}`,
        email: account.user,
        smtpHost: account.smtp.host,
        smtpPort: account.smtp.port,
        smtpUser: account.user,
        smtpPass: account.pass,
      },
    });
    console.log(`Created sender: ${sender.email} (id=${sender.id})`);
  }

  console.log(`\nDone. Preview sent emails at https://ethereal.email using these credentials.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
