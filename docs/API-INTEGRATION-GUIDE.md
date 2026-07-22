# Frontend API Integration Guide

A practical, end-to-end guide for frontend developers integrating with the PLEarn backend: authentication, challenge completion, reward evaluation, error handling, and ready-to-import API specs.

## Table of Contents

- [Base URL & Conventions](#base-url--conventions)
- [Authentication Flow](#authentication-flow)
  - [JWT Token Lifecycle](#jwt-token-lifecycle)
  - [Registration & Login (Step-by-Step)](#registration--login-step-by-step)
  - [Account Recovery (Forgot / Reset Password)](#account-recovery-forgot--reset-password)
- [Challenge Completion Workflow](#challenge-completion-workflow)
- [Reward Evaluation Timing & Status Transitions](#reward-evaluation-timing--status-transitions)
- [Integration Examples](#integration-examples)
- [Error Handling & Status Codes](#error-handling--status-codes)
- [Postman Collection & OpenAPI Spec](#postman-collection--openapi-spec)

---

## Base URL & Conventions

All endpoints are prefixed with `/api/v1`:

```
http://localhost:3000/api/v1   # development
```

- Request/response bodies are JSON (`Content-Type: application/json`).
- Protected routes require `Authorization: Bearer <accessToken>`.
- Timestamps are ISO 8601 strings (UTC).
- Monetary reward amounts are decimal strings/numbers denominated in XLM.

---

## Authentication Flow

### JWT Token Lifecycle

PLEarn uses stateless JWT authentication (`passport-jwt` + `@nestjs/jwt`).

1. **Issuance** — `POST /auth/register` and `POST /auth/login` both return a single `accessToken` (HS256, signed with `JWT_SECRET`).
2. **Expiry** — the token's lifetime is controlled by `JWT_EXPIRES_IN` (default **7 days**). The expiry is embedded in the token itself (`exp` claim) — there is nothing to poll server-side.
3. **Usage** — send it on every protected request: `Authorization: Bearer <accessToken>`.
4. **No refresh endpoint yet** — the API currently issues only a long-lived access token; there is **no `/auth/refresh` endpoint or refresh token** in this version. When the access token expires, protected requests will start returning `401 Unauthorized` and the client must prompt the user to log in again to obtain a new token. (A dedicated refresh-token mechanism is tracked separately — see the `JWT refresh token mechanism` issue in the repo — so treat this as the current, not final, behavior.)
5. **Revocation** — there is no server-side session/blacklist, so "logout" is a purely client-side action (discard the stored token). Tokens remain valid until they expire, even after a password reset invalidates the password itself.

**Recommended client-side handling:**

- Store the token in memory or a secure, httpOnly-adjacent storage strategy appropriate for your platform (avoid `localStorage` for high-security contexts; for most web apps a short-lived in-memory store + silent re-login prompt is simplest given there's no refresh flow yet).
- Decode the JWT's `exp` claim client-side (no server call needed) to proactively redirect to login before a request fails.
- Treat any `401` from a protected endpoint as "session expired" — clear the stored token and route to login.

### Registration & Login (Step-by-Step)

**1. Register a new user**

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "jane@example.com",
  "username": "jane",
  "password": "SecurePass123"
}
```

Response `201 Created` (validation errors aside, registration returns the same token shape as login):

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**2. Store the token** returned by the response (e.g. in memory / your app's auth store).

**3. Log in on subsequent visits**

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "jane@example.com",
  "password": "SecurePass123"
}
```

Response `200 OK`:

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**4. Fetch the current user** to hydrate your app state:

```http
GET /api/v1/users/me
Authorization: Bearer <accessToken>
```

```json
{
  "id": "3f2504e0-4f89-11d3-9a0c-0305e82c3301",
  "email": "jane@example.com",
  "username": "jane",
  "stellarPublicKey": null,
  "totalScore": 0,
  "createdAt": "2026-07-01T10:00:00.000Z",
  "updatedAt": "2026-07-01T10:00:00.000Z"
}
```

**5. (Optional) Link a Stellar wallet** — required before the user can receive reward payouts:

```http
PATCH /api/v1/users/me
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "stellarPublicKey": "GABCDEF...WALLETADDRESS"
}
```

### Account Recovery (Forgot / Reset Password)

Two-step, token-based flow. See [docs/PASSWORD-RESET.md](./PASSWORD-RESET.md) for full implementation detail; summary for integrators:

**1. Request a reset email**

```http
POST /api/v1/auth/forgot-password
Content-Type: application/json

{ "email": "jane@example.com" }
```

Always responds `200 OK` with a generic message, regardless of whether the email exists (prevents account enumeration):

```json
{ "message": "If an account with this email exists, a password reset link has been sent." }
```

Rate limited to 3 requests/minute/IP.

**2. Reset the password** using the token emailed to the user (valid for 1 hour, single-use):

```http
POST /api/v1/auth/reset-password
Content-Type: application/json

{
  "token": "uuid-token-from-email",
  "newPassword": "NewSecurePass456"
}
```

```json
{ "message": "Password has been successfully reset." }
```

Rate limited to 5 requests/minute/IP. After a successful reset, any previously issued JWTs remain valid until they naturally expire (no server-side revocation) — instruct users who suspect compromise to be aware of this.

---

## Challenge Completion Workflow

**1. List active challenges** (Redis-cached, 5 min TTL):

```http
GET /api/v1/challenges
Authorization: Bearer <accessToken>
```

```json
[
  {
    "id": "b1f2c3d4-5678-90ab-cdef-1234567890ab",
    "title": "Intro to Stellar",
    "description": "Learn the basics of the Stellar network.",
    "difficulty": "beginner",
    "maxScore": 10,
    "isActive": true,
    "createdAt": "2026-06-01T00:00:00.000Z"
  }
]
```

**2. Fetch a single challenge** (e.g. to render a detail page):

```http
GET /api/v1/challenges/b1f2c3d4-5678-90ab-cdef-1234567890ab
Authorization: Bearer <accessToken>
```

**3. Submit completion** once the user finishes the challenge:

```http
POST /api/v1/progress
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "challengeId": "b1f2c3d4-5678-90ab-cdef-1234567890ab",
  "activityType": "challenge_completed",
  "score": 75,
  "metadata": { "durationSeconds": 120, "attempts": 1 }
}
```

`activityType` must be one of `challenge_completed`, `lesson_completed`, `quiz_passed`.

Response `201 Created`:

```json
{
  "id": "9c858901-8a57-4791-81fe-4c455b099bc9",
  "challengeId": "b1f2c3d4-5678-90ab-cdef-1234567890ab",
  "activityType": "challenge_completed",
  "score": 75,
  "metadata": { "durationSeconds": 120, "attempts": 1 },
  "completedAt": "2026-07-22T09:15:00.000Z"
}
```

Behind the scenes, this single call:
1. Rejects the request with `409 Conflict` if the user already has a progress entry for that `challengeId` (each challenge can only be completed once per user).
2. Adds `score` to the user's `totalScore`.
3. Triggers reward evaluation (see below) — synchronously, before the response is returned.

> The `POST /progress` response does **not** include reward info directly. Poll `GET /rewards` after a successful submission if you want to show the user what they earned (see next section for timing).

**4. Read back progress / activity**

```http
GET /api/v1/progress                          # all completed challenges for the current user
GET /api/v1/progress/activity-log?limit=20     # recent activity, newest first (default limit: 20)
Authorization: Bearer <accessToken>
```

---

## Reward Evaluation Timing & Status Transitions

**Timing: synchronous, in the same request.** `POST /progress` calls `RewardsService.evaluateReward()` inline before responding — there is no background job or webhook. By the time your `POST /progress` call resolves, any resulting `Reward` row already exists (in `pending`, `distributed`, or `failed` state). Clients should fetch `GET /rewards` immediately after a successful progress submission to reflect the outcome in the UI.

**Eligibility:**

| Condition | Result |
|---|---|
| `score` doesn't meet any tier threshold | No reward is created at all |
| User has no `stellarPublicKey` linked | No reward is created, even if the score qualifies |
| Score qualifies **and** wallet is linked | A `Reward` row is created and a Stellar payment is attempted |

**Score → XLM tiers** (first matching tier wins, evaluated highest-first):

| Score Achieved | XLM Reward |
|---|---|
| ≥ 100 | 10 XLM |
| ≥ 50 | 5 XLM |
| ≥ 10 | 1 XLM |
| < 10 | No reward |

**Status transitions:**

```
(reward created) → pending → distributed   (Stellar payment succeeded)
                          → failed          (Stellar payment threw — logged server-side, no retry yet)
```

- `pending`: the reward row was just created; a Stellar transaction is being submitted synchronously.
- `distributed`: the Horizon transaction succeeded — `txHash` is populated.
- `failed`: the Horizon submission threw (e.g. underfunded distributor account, bad network) — `txHash` is `null`. There is currently no automatic retry; a manual/admin re-trigger would be needed (see reward retry mechanism in the roadmap).

**Fetching reward history:**

```http
GET /api/v1/rewards
Authorization: Bearer <accessToken>
```

```json
[
  {
    "id": "e5a1c2d3-...",
    "amount": "5.0000000",
    "status": "distributed",
    "txHash": "a1b2c3...stellartxhash",
    "reason": "Score 60 achieved",
    "createdAt": "2026-07-22T09:15:00.500Z"
  }
]
```

**Practical UI pattern:**

```js
async function completeChallenge(token, challengeId, score, metadata) {
  await postProgress(token, { challengeId, activityType: 'challenge_completed', score, metadata });
  // reward evaluation already happened server-side — just re-fetch to display it
  const rewards = await getRewards(token);
  return rewards[0]; // most recent reward, if any was created
}
```

---

## Integration Examples

### Fetch-based client (vanilla JS / TypeScript)

```ts
const BASE_URL = 'http://localhost:3000/api/v1';

async function apiRequest(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(res.status, error.message ?? 'Request failed', error);
  }
  if (res.status === 204) return null;
  return res.json();
}

class ApiError extends Error {
  constructor(status, message, body) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

// Login
const { accessToken } = await apiRequest('/auth/login', {
  method: 'POST',
  body: { email: 'jane@example.com', password: 'SecurePass123' },
});

// Authenticated call
const me = await apiRequest('/users/me', { token: accessToken });

// Complete a challenge
await apiRequest('/progress', {
  method: 'POST',
  token: accessToken,
  body: { challengeId: me.id, activityType: 'challenge_completed', score: 75 },
});
```

### Axios instance with a 401 → logout interceptor

```ts
import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:3000/api/v1' });

api.interceptors.request.use((config) => {
  const token = authStore.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // No refresh token exists yet — the only recovery is a fresh login.
      authStore.clear();
      router.push('/login');
    }
    return Promise.reject(err);
  },
);
```

### curl

```bash
# Register
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"jane@example.com","username":"jane","password":"SecurePass123"}'

# Login
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jane@example.com","password":"SecurePass123"}' | jq -r .accessToken)

# Complete a challenge
curl -X POST http://localhost:3000/api/v1/progress \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"challengeId":"b1f2c3d4-5678-90ab-cdef-1234567890ab","activityType":"challenge_completed","score":75}'

# Check rewards
curl http://localhost:3000/api/v1/rewards -H "Authorization: Bearer $TOKEN"
```

---

## Error Handling & Status Codes

The API uses NestJS's standard exception format:

```json
{
  "statusCode": 400,
  "message": "Validation failed" ,
  "error": "Bad Request"
}
```

For `class-validator` failures, `message` is an array of human-readable strings, e.g.:

```json
{
  "statusCode": 400,
  "message": ["email must be an email", "password must be longer than or equal to 8 characters"],
  "error": "Bad Request"
}
```

| Status | Meaning | Common causes in this API |
|---|---|---|
| `200 OK` | Success (GET / non-creating POST) | — |
| `201 Created` | Resource created | Register, login (token issuance), progress recorded |
| `400 Bad Request` | Validation failure or business rule violation | Missing/invalid fields, invalid or expired reset token, reset email already sent |
| `401 Unauthorized` | Missing, malformed, or expired JWT | No `Authorization` header, expired token, wrong login credentials |
| `404 Not Found` | Resource doesn't exist | Unknown challenge ID, unknown user ID |
| `409 Conflict` | Duplicate/unique constraint violation | Challenge already completed by this user, email already registered |
| `429 Too Many Requests` | Rate limit exceeded | Global: 100 req/min/IP. `forgot-password`: 3/min/IP. `reset-password`: 5/min/IP |
| `500 Internal Server Error` | Unhandled server error | Email delivery failure, unexpected DB error |

**Client-side recommendations:**

- Treat `401` uniformly as "not authenticated" — clear local auth state and redirect to login, since there is no refresh flow to attempt first.
- Surface `400` validation `message` arrays directly next to the relevant form fields where practical.
- Back off and retry with exponential delay on `429`.
- `409` on `POST /progress` is expected/benign — it means the challenge was already recorded; treat as a soft success in idempotent UI flows (e.g. just refresh progress instead of showing a hard error).

---

## Postman Collection & OpenAPI Spec

Machine-readable specs are provided so you can import the full API into your tool of choice instead of hand-building requests:

- [`docs/openapi.yaml`](./openapi.yaml) — OpenAPI 3.0 specification covering every endpoint, request/response schema, and status code described above. Import into Swagger UI, Insomnia, Postman, or generate a typed client (e.g. `openapi-typescript`, `orval`).
- [`docs/postman_collection.json`](./postman_collection.json) — ready-to-import Postman collection with a `{{baseUrl}}` and `{{accessToken}}` variable pair; the login/register requests auto-populate `{{accessToken}}` via a small test script so subsequent requests in the collection work out of the box.

**Quick start with Postman:**
1. Import `docs/postman_collection.json`.
2. Set the collection variable `baseUrl` (defaults to `http://localhost:3000/api/v1`).
3. Run **Auth → Login** (or **Register**) — the response script stores `accessToken` automatically for the rest of the collection.
