import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../lib/db";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { ensureUser } from "../services/users";
import { enqueueEmailJob } from "../lib/queue";
import { parseRecipientsFromBuffer, dedupeValidEmails } from "../utils/parseRecipients";

export const campaignsRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

const bodySchema = z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
  startTime: z.coerce.date(),
  delayMs: z.coerce.number().int().min(0).default(2000),
  hourlyLimit: z.coerce.number().int().min(1).default(200),
  recipients: z.array(z.string()).optional(),
});

// POST /api/campaigns
// Accepts either multipart/form-data with a `leadsFile` (CSV/txt) plus the
// text fields, or a plain JSON body with a `recipients` string array
// (handy for testing from Postman without a file).
campaignsRouter.post(
  "/",
  requireAuth,
  upload.single("leadsFile"),
  async (req: AuthedRequest, res) => {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const { subject, body, startTime, delayMs, hourlyLimit } = parsed.data;

    let recipients: string[] = [];
    if (req.file) {
      recipients = parseRecipientsFromBuffer(req.file.buffer);
    } else if (parsed.data.recipients) {
      recipients = dedupeValidEmails(parsed.data.recipients);
    }

    if (recipients.length === 0) {
      return res.status(400).json({ error: "No valid recipient email addresses found" });
    }

    const senders = await prisma.sender.findMany({ orderBy: { createdAt: "asc" } });
    if (senders.length === 0) {
      return res.status(500).json({
        error: "No senders configured. Run `npm run seed:senders` in the backend first.",
      });
    }

    const user = await ensureUser(req.user!);

    const campaign = await prisma.campaign.create({
      data: { userId: user.id, subject, body, startTime, delayMs, hourlyLimit },
    });

    // Spread sends `delayMs` apart starting at startTime, round-robin across
    // all configured senders so no single sender is hammered.
    const rows = recipients.map((recipient, i) => ({
      campaignId: campaign.id,
      senderId: senders[i % senders.length].id,
      recipient,
      subject,
      body,
      scheduledAt: new Date(startTime.getTime() + i * delayMs),
    }));

    await prisma.emailJob.createMany({ data: rows });
    const created = await prisma.emailJob.findMany({
      where: { campaignId: campaign.id },
      select: { id: true, scheduledAt: true },
    });

    // Enqueue in reasonably sized batches so a 1000+ recipient campaign
    // doesn't block the request thread on thousands of sequential awaits.
    const BATCH = 100;
    for (let i = 0; i < created.length; i += BATCH) {
      await Promise.all(
        created
          .slice(i, i + BATCH)
          .map((job) => enqueueEmailJob({ emailJobId: job.id, scheduledAt: job.scheduledAt }))
      );
    }

    res.status(201).json({
      campaignId: campaign.id,
      recipientCount: recipients.length,
      senderCount: senders.length,
    });
  }
);
