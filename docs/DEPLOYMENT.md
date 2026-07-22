# Production Deployment Guide

> Step-by-step guide for deploying the PLEarn Backend to a production environment.

This guide covers everything required to take PLEarn Backend from source to a
running, secure, and observable production service — a NestJS application backed
by PostgreSQL, Redis, and the Stellar network.

---

## Table of Contents

- [1. Prerequisites](#1-prerequisites)
- [2. Environment Setup](#2-environment-setup)
- [3. Production Environment Variables Checklist](#3-production-environment-variables-checklist)
- [4. Build & Install](#4-build--install)
- [5. Database Initialization & Migrations](#5-database-initialization--migrations)
- [6. Stellar Network Configuration (Testnet → Mainnet)](#6-stellar-network-configuration-testnet--mainnet)
- [7. Security Considerations](#7-security-considerations)
- [8. Running the Service in Production](#8-running-the-service-in-production)
- [9. Monitoring & Logging](#9-monitoring--logging)
- [10. Backup & Disaster Recovery](#10-backup--disaster-recovery)
- [11. Troubleshooting](#11-troubleshooting)
- [12. Post-Deployment Checklist](#12-post-deployment-checklist)

---

## 1. Prerequisites

The following runtime dependencies must be provisioned before deploying.

| Component     | Minimum Version | Recommended  | Notes                                             |
|---------------|-----------------|--------------|---------------------------------------------------|
| **Node.js**   | 20.x (LTS)      | 20.x or 22.x | The project targets the current Active LTS line.  |
| **npm**       | 10.x            | 10.x+        | Ships with Node 20+.                              |
| **PostgreSQL**| 14              | 16           | Primary datastore (via TypeORM + the `pg` driver).|
| **Redis**     | 6.2             | 7.x          | Used for response caching.                        |
| **Git**       | 2.x             | latest       | For pulling the release.                          |

Additional external services:

- **SendGrid account** — for transactional email (password reset, account recovery).
- **Stellar access** — a funded distributor account and, for on-chain rewards, a
  deployed Soroban reward contract.

> **Tip:** Pin the Node.js version in your deployment environment (e.g. an
> `.nvmrc` file or your platform's runtime setting) so builds are reproducible.

---

## 2. Environment Setup

1. **Clone the release**
   ```bash
   git clone https://github.com/SoroGame-Plearn/PLEarn-Backend.git
   cd PLEarn-Backend
   git checkout <release-tag>   # deploy a tagged release, not a moving branch
   ```

2. **Provision PostgreSQL** — create a dedicated database and a least-privilege
   application user:
   ```sql
   CREATE DATABASE plearn;
   CREATE USER plearn_app WITH ENCRYPTED PASSWORD '<strong-password>';
   GRANT ALL PRIVILEGES ON DATABASE plearn TO plearn_app;
   ```

3. **Provision Redis** — enable a password (`requirepass`) and, where supported,
   TLS. Do not expose Redis to the public internet.

4. **Create the environment file** — copy the example and fill in production
   values (see the checklist below):
   ```bash
   cp .env.example .env
   ```

---

## 3. Production Environment Variables Checklist

All configuration is loaded via `@nestjs/config` from the process environment.
Use this checklist to confirm every value is set correctly for production.

### Core

- [ ] `NODE_ENV=production` — **critical.** This disables TypeORM schema
      `synchronize` and SQL logging (see `src/app.module.ts`). Never run
      production with `NODE_ENV=development`.
- [ ] `PORT` — the port the HTTP server binds to (default `3000`).

### Database

- [ ] `DB_HOST`
- [ ] `DB_PORT` (default `5432`)
- [ ] `DB_USER` — the least-privilege application user, **not** `postgres`.
- [ ] `DB_PASS` — a strong, unique secret.
- [ ] `DB_NAME`

### JWT / Auth

- [ ] `JWT_SECRET` — a long, random secret (see [Security](#7-security-considerations)).
      Must **not** be the placeholder `change_me_in_production`.
- [ ] `JWT_EXPIRES_IN` (e.g. `7d`, or shorter for tighter security).

### Redis

- [ ] `REDIS_HOST`
- [ ] `REDIS_PORT` (default `6379`)

### Email (SendGrid)

- [ ] `SENDGRID_API_KEY`
- [ ] `FROM_EMAIL` — a verified sender/domain in SendGrid.
- [ ] `FROM_NAME`
- [ ] `FRONTEND_URL` — the production frontend origin (used to build links in
      password-reset / recovery emails). Must be the real HTTPS URL, not
      `http://localhost:3000`.

### Stellar / Soroban

- [ ] `STELLAR_NETWORK` — `testnet` or `public` (mainnet).
- [ ] `STELLAR_HORIZON_URL`
- [ ] `STELLAR_SOROBAN_RPC_URL`
- [ ] `STELLAR_REWARD_CONTRACT_ID` — the deployed contract ID for the target network.
- [ ] `STELLAR_DISTRIBUTOR_SECRET` — the funded distributor account secret key. **Treat as a top-tier secret.**

> **Never commit `.env`.** It is already covered by `.gitignore`. Inject secrets
> through your platform's secret manager (AWS Secrets Manager, GCP Secret
> Manager, Vault, Docker/Kubernetes secrets) rather than a file on disk where
> possible.

---

## 4. Build & Install

Install dependencies and compile the TypeScript sources to `dist/`:

```bash
npm ci                 # clean, lockfile-exact install
npm run build          # nest build -> dist/
```

Use `npm ci` (not `npm install`) in CI/CD so builds match `package-lock.json`
exactly.

---

## 5. Database Initialization & Migrations

In production, TypeORM `synchronize` is **disabled** (it is only enabled when
`NODE_ENV !== 'production'`, see `src/app.module.ts:37`). This means the schema
is **not** auto-created — you must run migrations explicitly.

Migrations live in `src/database/migrations/` and are driven by the data source
at `src/database/data-source.ts`.

### Apply migrations

```bash
npm run migration:run       # typeorm migration:run -d src/database/data-source.ts
```

### Roll back the last migration

```bash
npm run migration:revert
```

> **Ordering matters:** run migrations **after** deploying new code (which
> contains the migration files) but **before** the new application instance
> starts serving traffic. In a zero-downtime pipeline, make migrations
> backward-compatible so old and new code can briefly coexist.

**Recommendations**

- Always **back up the database before running migrations** (see
  [Backup & Disaster Recovery](#10-backup--disaster-recovery)).
- Run migrations as a discrete, gated step in your deploy pipeline — never rely
  on `synchronize` in production.
- Test every migration against a staging copy of production data first.

---

## 6. Stellar Network Configuration (Testnet → Mainnet)

PLEarn uses Stellar for reward distribution. Moving from testnet to mainnet
("public" network) is a deliberate, one-way-feeling transition — plan it
carefully.

### Testnet (staging / pre-production)

```bash
STELLAR_NETWORK=testnet
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
STELLAR_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
STELLAR_REWARD_CONTRACT_ID=<testnet-contract-id>
STELLAR_DISTRIBUTOR_SECRET=<testnet-distributor-secret>
```

Testnet accounts can be funded for free via **Friendbot**.

### Mainnet (production)

```bash
STELLAR_NETWORK=public
STELLAR_HORIZON_URL=https://horizon.stellar.org
STELLAR_SOROBAN_RPC_URL=https://mainnet.sorobanrpc.com
STELLAR_REWARD_CONTRACT_ID=<mainnet-contract-id>
STELLAR_DISTRIBUTOR_SECRET=<mainnet-distributor-secret>
```

### Transition checklist

- [ ] **Deploy & verify the reward contract on mainnet.** The testnet contract ID
      is not valid on mainnet — deploy separately and record the new ID.
- [ ] **Create and fund a dedicated mainnet distributor account** with real XLM.
      Keep only the working balance needed for reward payouts (a "hot wallet"),
      and top it up from cold storage.
- [ ] **Update all four Stellar env vars** (`STELLAR_NETWORK`, both URLs, contract ID)
      plus the distributor secret to their mainnet values.
- [ ] **Run an end-to-end reward test** with a small amount on mainnet before
      opening the flow to real users.
- [ ] **Set up balance monitoring & alerting** on the distributor account so
      payouts never fail due to insufficient funds.
- [ ] **Confirm reserve requirements** — trustlines/subentries consume XLM
      reserves; ensure the account stays above minimum balance.

> **Consider using a reputable managed/paid Horizon & Soroban RPC provider** for
> mainnet rather than the public SDF endpoints, which are rate-limited and not
> intended for production load.

---

## 7. Security Considerations

### JWT secret

- Generate a high-entropy `JWT_SECRET`, e.g.:
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
  ```
- Never reuse the placeholder `change_me_in_production`, and never share the
  same secret across environments.
- Consider a shorter `JWT_EXPIRES_IN` in production and pair it with a refresh
  flow (see upstream issue for the refresh-token mechanism).

### API rate limiting

Rate limiting is enforced globally by `@nestjs/throttler` via a
`ThrottlerGuard` registered as an `APP_GUARD` (`src/app.module.ts`). The default
is **100 requests / 60s** per client. Sensitive auth endpoints apply stricter
per-route limits.

- Review and tune the global `ttl`/`limit` for your expected production traffic.
- Because the app runs behind a reverse proxy/load balancer, ensure the client
  IP is derived correctly (configure Express `trust proxy` / forwarded headers)
  so throttling keys on the real client rather than the proxy.

### Transport & network

- **Terminate TLS** at a reverse proxy (Nginx, Caddy, ALB) or the platform edge —
  the Node process should never be exposed directly over plain HTTP.
- Restrict `enableCors()` in `src/main.ts` to known frontend origins in
  production instead of allowing all origins.
- Keep PostgreSQL and Redis on a private network; enable auth/TLS on both.
- Global input validation is already enabled (`ValidationPipe` with
  `whitelist: true`), which strips unknown properties from request bodies.

### Secrets management

- Store all secrets (`JWT_SECRET`, `DB_PASS`, `SENDGRID_API_KEY`,
  `STELLAR_DISTRIBUTOR_SECRET`) in a secret manager, not in the repo or an image.
- Rotate credentials periodically and immediately on any suspected compromise.
- Restrict who and what can read `STELLAR_DISTRIBUTOR_SECRET` — it controls real
  funds on mainnet.

### Dependencies

- Run `npm audit` in CI and patch known vulnerabilities before release.
- Deploy tagged releases only; avoid deploying moving branches.

---

## 8. Running the Service in Production

The API is served under the global prefix **`/api/v1`** (see
`src/main.ts`) and listens on `PORT`.

### Start command

```bash
npm run start:prod      # node dist/main
```

### Process management

Do **not** run `node dist/main` bare. Use a supervisor that restarts on crash
and starts on boot:

- **PM2** — `pm2 start dist/main.js --name plearn-backend -i max`
- **systemd** — a unit file with `Restart=always`.
- **Docker / Kubernetes** — a container with a restart policy and liveness/readiness probes.

### Reverse proxy

Front the app with Nginx/Caddy/ALB to terminate TLS, enforce HTTPS, and load
balance across instances. Proxy to `http://127.0.0.1:$PORT`.

---

## 9. Monitoring & Logging

### Application logs

- Ship stdout/stderr to a centralized log aggregator (CloudWatch, Loki/Grafana,
  Datadog, ELK). NestJS logs to stdout by default.
- SQL logging is enabled only in development (`src/app.module.ts`), so production
  logs stay clean.
- Use structured (JSON) logging for machine parsing where possible.

### Health & uptime

- Add an uptime/health check hitting a lightweight endpoint under `/api/v1`.
- Configure liveness/readiness probes for container orchestrators.

### Metrics & alerting — recommended signals

| Area        | Watch for                                                        |
|-------------|------------------------------------------------------------------|
| HTTP        | 5xx rate, p95/p99 latency, request throughput.                   |
| Database    | Connection pool saturation, slow queries, replication lag.       |
| Redis       | Memory usage, eviction rate, hit ratio, connectivity.            |
| Throttling  | Spikes in 429 responses (possible abuse or misconfigured limits).|
| Stellar     | Distributor account balance, failed/timed-out reward transactions.|
| Host        | CPU, memory, disk, event-loop lag.                               |

Set alerts on the **distributor account balance** and on **failed reward
transactions** — these directly affect users receiving rewards.

---

## 10. Backup & Disaster Recovery

### PostgreSQL backups

- Enable **automated daily backups** plus **point-in-time recovery (PITR)** via
  WAL archiving (or your managed provider's equivalent).
- Take an on-demand logical backup immediately **before every migration**:
  ```bash
  pg_dump -Fc -h $DB_HOST -U $DB_USER $DB_NAME > plearn-$(date +%F).dump
  ```
- Store backups off-host in durable storage (e.g. S3) with encryption at rest.
- **Test restores regularly** — an untested backup is not a backup.

### Redis

- Redis holds cache data only; it can be rebuilt from PostgreSQL. Persistence
  (RDB/AOF) is optional but reduces cold-cache impact after a restart.

### Stellar keys

- Back up the distributor account secret in a secure, offline location (secret
  manager + sealed offline copy). **Loss of the distributor key can mean loss of
  funds.**

### Recovery objectives & runbook

- Define an **RPO** (max acceptable data loss) and **RTO** (max acceptable
  downtime) and size backup frequency to match.
- Maintain a written recovery runbook: restore DB → apply migrations → redeploy
  app → verify health → verify a test reward. Rehearse it periodically.

---

## 11. Troubleshooting

| Symptom | Likely cause | Resolution |
|---------|--------------|------------|
| App exits on boot with a DB connection error | Wrong `DB_*` values, DB not reachable, or firewall rules | Verify credentials and network path; confirm PostgreSQL accepts connections from the app host. |
| Tables missing / "relation does not exist" | Migrations not run (production has `synchronize` off) | Run `npm run migration:run`. |
| Schema changed unexpectedly in production | `NODE_ENV` not set to `production`, so `synchronize` ran | Set `NODE_ENV=production` and restore from backup if needed. |
| `401 Unauthorized` on valid tokens after redeploy | `JWT_SECRET` changed between deploys | Keep `JWT_SECRET` stable across releases; rotate deliberately. |
| Frequent `429 Too Many Requests` | Throttler limit too low, or client IP resolves to the proxy | Tune `ThrottlerModule` limits; configure `trust proxy`/forwarded headers. |
| Reward emails / recovery emails not delivered | Bad `SENDGRID_API_KEY`, unverified `FROM_EMAIL`, or wrong `FRONTEND_URL` | Verify the SendGrid key and sender identity; set `FRONTEND_URL` to the real HTTPS origin. |
| Rewards fail to send on-chain | Distributor unfunded, wrong `STELLAR_NETWORK`, or wrong contract ID | Fund the distributor; confirm network + `STELLAR_REWARD_CONTRACT_ID` match the target network. |
| Cache not working / stale data | Redis unreachable or wrong `REDIS_*` values | Verify Redis connectivity and credentials. |
| CORS errors from the frontend | `enableCors()` origin not restricted / mismatched | Configure allowed origins to include the production frontend. |

**General debugging steps**

1. Check application logs first (startup errors are usually explicit).
2. Confirm all environment variables from the [checklist](#3-production-environment-variables-checklist) are present and correct.
3. Verify connectivity to PostgreSQL, Redis, SendGrid, and Stellar endpoints from the app host.
4. Confirm migrations are applied and the schema matches the deployed code.

---

## 12. Post-Deployment Checklist

- [ ] `NODE_ENV=production` confirmed.
- [ ] All environment variables set (Section 3) with no placeholders remaining.
- [ ] `npm ci && npm run build` completed successfully.
- [ ] Database backed up, then `npm run migration:run` applied cleanly.
- [ ] Correct Stellar network + contract configured; distributor funded and monitored.
- [ ] TLS enforced; CORS restricted; secrets loaded from a secret manager.
- [ ] Process supervisor (PM2/systemd/K8s) running with auto-restart.
- [ ] Logs shipping to a central aggregator; health checks green.
- [ ] Monitoring & alerts configured (5xx, latency, DB, Redis, distributor balance).
- [ ] Backups automated and a restore has been test-verified.
- [ ] A smoke test (register/login, a cached read, a test reward) passed against production.

---

_For architecture context, see [`ARCHITECTURE.md`](../ARCHITECTURE.md). For local
setup and API reference, see the [`README`](../README.md)._
