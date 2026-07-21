# PLEarn Backend

> Progress tracking, achievement scoring, and Stellar-powered reward distribution for the PLEarn platform.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Folder Structure](#folder-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Reward Logic](#reward-logic)
- [Blockchain Integration](#blockchain-integration)
- [Caching](#caching)
- [Database Migrations](#database-migrations)
- [Testing](#testing)
- [Roadmap](#roadmap)

---

## Overview

PLEarn Backend is the server-side layer for the PLEarn learning platform. It handles:

- **Authentication** — JWT-based register/login
- **User profiles** — with optional Stellar wallet linkage
- **Progress tracking** — records completed challenges, scores, and activity logs
- **Reward distribution** — automatically sends XLM to users via Stellar when score thresholds are met
- **Caching** — Redis-backed caching for high-read endpoints (e.g. challenge listings)

---

## Tech Stack

| Layer        | Technology                        |
|--------------|-----------------------------------|
| Framework    | NestJS (TypeScript)               |
| Database     | PostgreSQL + TypeORM              |
| Auth         | JWT (passport-jwt)                |
| Cache        | Redis (cache-manager)             |
| Blockchain   | Stellar SDK (Horizon + Soroban)   |
| Validation   | class-validator / class-transformer |

---

## Architecture

### High-Level Overview

```
Client
  │
  ▼
NestJS API (REST)
  ├── Auth Module        → JWT issue & validation
  ├── Users Module       → Profile management
  ├── Progress Module    → Challenge completion + activity log
  ├── Rewards Module     → Score-based reward evaluation
  ├── Challenges Module  → Challenge catalogue (Redis cached)
  └── Blockchain Module  → Stellar payment transactions
        │
        ▼
   PostgreSQL          Redis
        │
        ▼
   Stellar Network (Testnet / Mainnet)
```

### System Architecture Diagram

For a comprehensive visual overview of the complete system architecture, including API layer, services, data access layer, and external systems, see the [System Architecture Diagram](./docs/architecture-diagram.svg).

### Detailed Architecture Documentation

For in-depth information about:
- **Module descriptions and responsibilities**
- **Data flow for key operations** (registration, challenge completion, reward distribution)
- **Component interactions and dependencies**
- **Technology stack details**
- **Deployment architecture**
- **Scalability considerations**

Please refer to the [Architecture Guide](./ARCHITECTURE.md) document.

### Data Flow Diagrams

Detailed sequence diagrams for key workflows including:
- User registration and login flows
- Challenge completion and reward distribution
- Caching strategies
- Error handling

Are available in [Data Flow Documentation](./docs/DATA-FLOW.md).

---

## Folder Structure

```
src/
├── main.ts                        # Bootstrap, global pipes, CORS
├── app.module.ts                  # Root module
│
├── config/                        # Typed config factories
│   ├── app.config.ts
│   ├── database.config.ts
│   ├── jwt.config.ts
│   ├── redis.config.ts
│   └── stellar.config.ts
│
├── auth/                          # JWT authentication
│   ├── auth.controller.ts         # POST /auth/register, /auth/login
│   ├── auth.service.ts
│   ├── auth.dto.ts
│   ├── auth.module.ts
│   ├── jwt.strategy.ts
│   └── jwt-auth.guard.ts
│
├── users/                         # User profiles
│   ├── user.entity.ts
│   ├── user.dto.ts
│   ├── users.service.ts
│   ├── users.controller.ts        # GET /users/me, PATCH /users/me
│   └── users.module.ts
│
├── progress/                      # Challenge progress & activity log
│   ├── progress.entity.ts
│   ├── progress.dto.ts
│   ├── progress.service.ts
│   ├── progress.controller.ts     # POST /progress, GET /progress
│   └── progress.module.ts
│
├── rewards/                       # Reward evaluation & history
│   ├── reward.entity.ts
│   ├── rewards.service.ts
│   ├── rewards.controller.ts      # GET /rewards
│   └── rewards.module.ts
│
├── challenges/                    # Challenge catalogue
│   ├── challenge.entity.ts
│   ├── challenges.service.ts      # Redis-cached findAll
│   ├── challenges.controller.ts   # GET /challenges, GET /challenges/:id
│   └── challenges.module.ts
│
├── blockchain/                    # Stellar integration
│   ├── blockchain.service.ts      # distributeReward()
│   └── blockchain.module.ts
│
├── common/
│   └── decorators/
│       └── current-user.decorator.ts
│
└── database/
    ├── data-source.ts             # TypeORM CLI data source
    ├── migrations/                # Generated migration files
    └── seeds/                     # Optional seed scripts
```

---

## Getting Started

### Prerequisites

- Node.js ≥ 20
- PostgreSQL ≥ 15
- Redis ≥ 7

### Install

```bash
npm install
```

### Configure

```bash
cp .env.example .env
# Edit .env with your DB, Redis, JWT, and Stellar credentials
```

### Run (development)

```bash
npm run start:dev
```

The API will be available at `http://localhost:3000/api/v1`.

### Run (production)

```bash
npm run build
npm run start:prod
```

---

## Environment Variables

| Variable                    | Description                                  | Default                                    |
|-----------------------------|----------------------------------------------|--------------------------------------------|
| `NODE_ENV`                  | `development` / `production`                 | `development`                              |
| `PORT`                      | HTTP port                                    | `3000`                                     |
| `DB_HOST`                   | PostgreSQL host                              | `localhost`                                |
| `DB_PORT`                   | PostgreSQL port                              | `5432`                                     |
| `DB_USER`                   | PostgreSQL user                              | `postgres`                                 |
| `DB_PASS`                   | PostgreSQL password                          | —                                          |
| `DB_NAME`                   | Database name                                | `plearn`                                   |
| `JWT_SECRET`                | Secret for signing JWTs                      | —                                          |
| `JWT_EXPIRES_IN`            | Token expiry                                 | `7d`                                       |
| `REDIS_HOST`                | Redis host                                   | `localhost`                                |
| `REDIS_PORT`                | Redis port                                   | `6379`                                     |
| `STELLAR_NETWORK`           | `testnet` or `mainnet`                       | `testnet`                                  |
| `STELLAR_HORIZON_URL`       | Horizon server URL                           | `https://horizon-testnet.stellar.org`      |
| `STELLAR_SOROBAN_RPC_URL`   | Soroban RPC URL                              | `https://soroban-testnet.stellar.org`      |
| `STELLAR_REWARD_CONTRACT_ID`| Soroban contract ID (future use)             | —                                          |
| `STELLAR_DISTRIBUTOR_SECRET`| Secret key of the reward distributor account | —                                          |

---

## API Reference

All routes are prefixed with `/api/v1`. Protected routes require `Authorization: Bearer <token>`.

### Auth

| Method | Endpoint           | Auth | Description          |
|--------|--------------------|------|----------------------|
| POST   | `/auth/register`   | —    | Register a new user  |
| POST   | `/auth/login`      | —    | Login, receive JWT   |
| POST   | `/auth/forgot-password` | —    | Request password reset email |
| POST   | `/auth/reset-password`  | —    | Reset password with token |

### Users

| Method | Endpoint       | Auth | Description                    |
|--------|----------------|------|--------------------------------|
| GET    | `/users/me`    | ✅   | Get current user profile       |
| PATCH  | `/users/me`    | ✅   | Update username / Stellar key  |
| GET    | `/users/:id`   | ✅   | Get any user by ID             |

### Progress

| Method | Endpoint                    | Auth | Description                        |
|--------|-----------------------------|------|------------------------------------|
| POST   | `/progress`                 | ✅   | Record a completed challenge       |
| GET    | `/progress`                 | ✅   | Get all completed challenges       |
| GET    | `/progress/activity-log`    | ✅   | Get recent activity (default: 20)  |

**POST `/progress` body:**
```json
{
  "challengeId": "uuid",
  "activityType": "challenge_completed",
  "score": 75,
  "metadata": {}
}
```

### Challenges

| Method | Endpoint            | Auth | Description              |
|--------|---------------------|------|--------------------------|
| GET    | `/challenges`       | ✅   | List all active challenges (cached) |
| GET    | `/challenges/:id`   | ✅   | Get a single challenge   |

### Rewards

| Method | Endpoint    | Auth | Description              |
|--------|-------------|------|--------------------------|
| GET    | `/rewards`  | ✅   | Get current user's rewards |

---

## Reward Logic

Rewards are evaluated automatically when a challenge is completed. The scoring tiers are:

| Score Achieved | XLM Reward |
|----------------|------------|
| ≥ 100          | 10 XLM     |
| ≥ 50           | 5 XLM      |
| ≥ 10           | 1 XLM      |
| < 10           | No reward  |

The reward flow:

1. User completes a challenge → `POST /progress`
2. `ProgressService` saves the entry and calls `RewardsService.evaluateReward()`
3. If the user has a linked Stellar public key and meets a tier, a `Reward` record is created with status `pending`
4. `BlockchainService.distributeReward()` submits a Stellar payment transaction
5. On success, the reward is updated to `distributed` with the transaction hash stored
6. On failure, status is set to `failed` and the error is logged

---

## Blockchain Integration

The `BlockchainService` uses the official `stellar-sdk` to submit XLM payments via Horizon.

**To enable rewards:**
1. Create a Stellar testnet account at [https://laboratory.stellar.org](https://laboratory.stellar.org)
2. Fund it using Friendbot
3. Set `STELLAR_DISTRIBUTOR_SECRET` in your `.env`
4. Users must link their Stellar public key via `PATCH /users/me`

Soroban smart contract integration (`STELLAR_REWARD_CONTRACT_ID`) is scaffolded for Phase 2 expansion.

---

## Caching

Redis caching is applied to the challenge catalogue (`GET /challenges`) with a 5-minute TTL. This prevents repeated DB queries for a high-read, low-write dataset.

To extend caching to other endpoints, inject `CACHE_MANAGER` and use `cache.get` / `cache.set`.

---

## Database Migrations

TypeORM migrations are used in production. In development, `synchronize: true` auto-syncs the schema.

```bash
# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Generate a new migration (after entity changes)
npx typeorm migration:generate src/database/migrations/MigrationName -d src/database/data-source.ts
```

---

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e
```

Tests live in `test/` for e2e and alongside source files as `*.spec.ts` for unit tests.

---

## Roadmap

- [ ] Soroban smart contract reward distribution
- [ ] Leaderboard endpoint
- [ ] Achievement badges
- [ ] Email notifications on reward distribution
- [ ] Rate limiting
- [ ] Admin panel endpoints
- [ ] WebSocket activity feed
