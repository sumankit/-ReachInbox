# ReachInbox — Email Job Scheduler

A production-shaped email scheduler service + dashboard: schedule emails via API,
deliver them at the right time with BullMQ (no cron), survive restarts without
losing or duplicating jobs, and manage everything from a Next.js dashboard.

## Stack

- **Backend**: Express + TypeScript, Prisma → PostgreSQL, BullMQ → Redis, Nodemailer → Ethereal
- **Frontend**: Next.js (App Router) + TypeScript + Tailwind CSS + NextAuth (Google OAuth)
- **Infra**: Docker Compose for Postgres + Redis

## Repo layout

```
backend/     Express API + BullMQ worker + Prisma schema
frontend/    Next.js dashboard
docker-compose.yml   Postgres + Redis (with persistent volumes)
```

---

## 1. Run it

### 1a. Start infra

```bash
docker compose up -d
```

This starts Postgres (`localhost:5432`) and Redis (`localhost:6379`), both with
Docker volumes so their data (and BullMQ's delayed jobs) survive container
restarts, not just app-process restarts.

### 1b. Backend

```bash
cd backend
cp .env.example .env        # fill in JWT_SHARED_SECRET (any long random string)
npm install
npm run prisma:migrate      # creates tables
npm run seed:senders        # creates 3 Ethereal test SMTP accounts, saves as Senders
npm run dev                 # starts the API on :4000
```

In a **second terminal**, start the worker (a separate process, as it would be in production):

```bash
cd backend
npm run worker
```

### 1c. Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev                 # http://localhost:3000
```

### 1d. Google OAuth setup

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials).
2. Create an **OAuth 2.0 Client ID** → Application type: **Web application**.
3. Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`.
4. Copy the Client ID/Secret into `frontend/.env.local` as `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
5. Set `NEXTAUTH_SECRET` (frontend) and `JWT_SHARED_SECRET` (backend) to the **same** random string — the frontend signs a JWT after Google login and the backend verifies it with this shared secret, so the backend never talks to Google directly.

### 1e. Ethereal Email

No manual signup needed — `npm run seed:senders` (in `backend/`) programmatically
creates fresh Ethereal test SMTP accounts via `nodemailer.createTestAccount()`
and stores them as `Sender` rows in Postgres. Run it with a number to create
more: `npm run seed:senders -- 5`. Sent messages can be previewed at
[ethereal.email](https://ethereal.email) using the generated credentials
printed by the script (or from `nodemailer.getTestMessageUrl`, logged for
each send).

---

## 2. Architecture

### How scheduling works (no cron)

- Every recipient in a "Compose new email" submission becomes one `EmailJob`
  row in Postgres (`status = SCHEDULED`, `scheduledAt` computed from
  `startTime + index * delayMs`), assigned to a sender **round-robin** across
  all configured `Sender`s.
- Each row is pushed into a single BullMQ queue (`email-jobs`) as a **delayed
  job**: `delay = scheduledAt - now`. BullMQ stores this in Redis and fires
  the job to a worker exactly when the delay elapses — no polling, no cron.
- The BullMQ `jobId` is set to the `EmailJob.id` (a UUID). BullMQ dedupes by
  `jobId`, so calling "add to queue" twice for the same row is a no-op. This
  is the core of the idempotency guarantee end-to-end.

### How persistence on restart is handled

- Redis runs with `--appendonly yes` (AOF) behind a Docker volume, so BullMQ's
  delayed jobs survive a Redis container restart, not just the Node process.
- On top of that, both the API and the worker run a **reconciliation pass**
  on boot (`services/reconcile.ts`): it queries Postgres for every `EmailJob`
  still `SCHEDULED` and checks whether a matching BullMQ job exists in Redis.
  Missing ones are re-added with the correct remaining delay (or `delay: 0`
  if the time already passed). Because `jobId = EmailJob.id`, this is safe to
  run every boot — it never duplicates a job that's still present.
- This covers both failure modes: (a) the Node process crashes/restarts —
  Redis still has the jobs, reconciliation is a no-op; (b) Redis itself is
  wiped — Postgres is still the source of truth and reconciliation rebuilds
  the queue from it.
- **Idempotent send guard**: right before sending, the worker does
  `UPDATE "EmailJob" SET status='PROCESSING' WHERE id=$1 AND status='SCHEDULED'`.
  Only the worker that "wins" this conditional update proceeds to send. A
  duplicate delivery attempt (BullMQ retry after a crash mid-send, or a
  second worker instance) sees `0` rows affected and skips — so a restart
  mid-send can never double-send.

### How rate limiting & concurrency are implemented

- **Worker concurrency**: `WORKER_CONCURRENCY` env var passed straight to
  BullMQ's `Worker({ concurrency })`. Safe under concurrency because the
  idempotency guard above uses an atomic conditional `UPDATE`, and the rate
  counters below use atomic Redis `INCR`, so no per-job logic depends on
  in-process state shared across workers.
- **Minimum delay between sends**: `MIN_DELAY_BETWEEN_EMAILS_MS` is enforced
  via BullMQ's built-in `Worker({ limiter: { max: 1, duration } })`, which
  throttles how fast the worker pulls jobs off the queue, globally, across
  all senders. Default: **2000ms** between any two sends.
- **Per-sender hourly cap**: enforced in `services/rateLimiter.ts` using a
  Redis counter keyed `rl:{senderId}:{YYYYMMDDHH}`, incremented atomically
  with `INCR` (safe across multiple worker processes/instances — no
  in-memory counters) and expired after 2 hours. `MAX_EMAILS_PER_HOUR_PER_SENDER`
  is the default; a campaign can also set its own `hourlyLimit` from the
  compose form, which is what's actually checked per send.
- **Behavior when the hourly limit is hit**: the job is **not failed or
  dropped**. Its DB row is set back to `SCHEDULED` with `scheduledAt` moved
  to the start of the next hour window, and it's re-added to BullMQ with a
  delay for that new time (dedup-safe, same `jobId`). This naturally spills
  a burst of 1000+ same-time emails across however many hour windows are
  needed, sender by sender.
- **Trade-off**: because delayed re-scheduling changes a job's position in
  BullMQ's internal delay-sorted set, strict FIFO order for a sender's
  overflowed emails is only *approximately* preserved (by original
  `scheduledAt`), not byte-for-byte guaranteed across every re-delay. Good
  enough for cold-outreach ordering; would need a per-sender ordered
  ledger for stricter guarantees.

### Behavior under load (1000+ emails at once)

- All `EmailJob` rows for a campaign are inserted in one `createMany` call
  (fast, single round-trip), then enqueued into BullMQ in batches of 100
  (parallel `Promise.all` per batch) so the HTTP request doesn't block on
  thousands of sequential awaits.
- From there, the worker's concurrency + global min-delay + per-sender
  hourly counters take over identically whether 10 or 10,000 jobs are
  queued — nothing in the hot path is O(queue size).

---

## 3. Features implemented

**Backend**
- [x] Schedule API (`POST /api/campaigns`) — CSV/txt upload or JSON `recipients[]`
- [x] BullMQ delayed jobs, no cron, `jobId`-based idempotent scheduling
- [x] Restart-safe via Redis AOF + DB-driven reconciliation on boot
- [x] Idempotent send via conditional `UPDATE ... WHERE status='SCHEDULED'`
- [x] Configurable worker concurrency (`WORKER_CONCURRENCY`)
- [x] Global min delay between sends (`MIN_DELAY_BETWEEN_EMAILS_MS`, BullMQ limiter)
- [x] Redis-backed per-sender hourly rate limit, overflow → reschedule (not drop)
- [x] Multiple Ethereal senders, round-robin distribution
- [x] `GET /api/emails?status=scheduled|sent`, `GET /api/senders`

**Frontend**
- [x] Google OAuth login (NextAuth) → dashboard redirect
- [x] Header with avatar / name / email / logout
- [x] Scheduled Emails / Sent Emails tabs with loading + empty states
- [x] Compose New Email modal — subject, body, CSV/txt upload with parsed lead
      count, start time, delay, hourly limit
- [x] Reusable UI components (Button, Input/Textarea, Modal, StatusBadge, etc.)
- [x] Typed API client + shared TS interfaces for all API responses

---

## 4. Assumptions, shortcuts, trade-offs

- Rate limiting keys off `Sender.id` + the campaign's `hourlyLimit`; if two
  campaigns use the same sender with different `hourlyLimit` values, the cap
  actually enforced for a given hour is whichever job is checked in that
  window (they share one Redis counter) — acceptable for this assignment,
  would move to a single per-sender config in a real product.
- CSV parsing accepts any file with valid-looking email addresses in any
  column/line (header rows, multi-column exports, plain line lists) rather
  than requiring a strict schema — chosen to make the demo file friction-free.
- No email open/click tracking, unsubscribe handling, or bounce processing —
  out of scope for this assignment.
- Single Postgres/Redis instance, no HA — fine for a take-home; the
  concurrency-safety work (atomic `UPDATE`, Redis `INCR`) is what would let
  this scale to multiple instances without changes.
