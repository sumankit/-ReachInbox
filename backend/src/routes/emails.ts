import { Router } from "express";
import { prisma } from "../lib/db";
import { requireAuth } from "../middleware/auth";

export const emailsRouter = Router();

// GET /api/emails?status=scheduled|sent
emailsRouter.get("/", requireAuth, async (req, res) => {
  const status = String(req.query.status ?? "scheduled").toLowerCase();

  const where =
    status === "sent"
      ? { status: { in: ["SENT", "FAILED"] as ("SENT" | "FAILED")[] } }
      : { status: { in: ["SCHEDULED", "PROCESSING"] as ("SCHEDULED" | "PROCESSING")[] } };

  const jobs = await prisma.emailJob.findMany({
    where,
    orderBy: status === "sent" ? { sentAt: "desc" } : { scheduledAt: "asc" },
    take: 500,
    select: {
      id: true,
      recipient: true,
      subject: true,
      body: true,
      scheduledAt: true,
      sentAt: true,
      status: true,
      error: true,
      sender: { select: { email: true, name: true } },
    },
  });

  res.json({ jobs });
});
