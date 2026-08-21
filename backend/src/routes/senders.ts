import { Router } from "express";
import { prisma } from "../lib/db";
import { requireAuth } from "../middleware/auth";

export const sendersRouter = Router();

sendersRouter.get("/", requireAuth, async (_req, res) => {
  const senders = await prisma.sender.findMany({
    select: { id: true, name: true, email: true },
    orderBy: { createdAt: "asc" },
  });
  res.json({ senders });
});
