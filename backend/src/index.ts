import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { config } from "./config";
import { campaignsRouter } from "./routes/campaigns";
import { emailsRouter } from "./routes/emails";
import { sendersRouter } from "./routes/senders";
import { reconcileScheduledJobs } from "./services/reconcile";
import { openApiSpec } from "./openapi";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

// Interactive API docs: http://localhost:4000/docs
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

app.use("/api/campaigns", campaignsRouter);
app.use("/api/emails", emailsRouter);
app.use("/api/senders", sendersRouter);

async function main() {
  // On every boot, make sure every DB row still SCHEDULED actually has a
  // live BullMQ job behind it. See services/reconcile.ts for why.
  const reEnqueued = await reconcileScheduledJobs();
  if (reEnqueued > 0) {
    console.log(`[boot] Re-enqueued ${reEnqueued} scheduled job(s) after restart.`);
  }

  app.listen(config.port, () => {
    console.log(`API listening on http://localhost:${config.port}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});
