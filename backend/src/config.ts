import "dotenv/config";

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseUrl: required("DATABASE_URL"),
  redisUrl: required("REDIS_URL", "redis://localhost:6379"),
  jwtSharedSecret: required("JWT_SHARED_SECRET"),
  workerConcurrency: Number(process.env.WORKER_CONCURRENCY ?? 5),
  minDelayBetweenEmailsMs: Number(process.env.MIN_DELAY_BETWEEN_EMAILS_MS ?? 2000),
  maxEmailsPerHourPerSender: Number(process.env.MAX_EMAILS_PER_HOUR_PER_SENDER ?? 200),
};
