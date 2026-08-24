# Input Validation

This document describes how request input is validated across the API, the
rules enforced on each field, and the shape of validation error responses.

## Global setup

- `main.ts` registers a global `ValidationPipe` with:
  - `whitelist: true` — strips any property not declared on the DTO.
  - `forbidNonWhitelisted: true` — rejects requests that include unknown
    properties instead of silently dropping them.
  - `transform: true` — converts payloads into DTO class instances so
    `class-validator` decorators run, and coerces primitive types (e.g.
    query string numbers).
  - A custom `exceptionFactory` that flattens all validation failures
    (including nested ones) into a flat array of human-readable messages.
- `HttpExceptionFilter` (`src/common/filters/http-exception.filter.ts`) is
  registered globally and converts every `HttpException` — validation errors
  included — into a standardized JSON error body:

  ```json
  {
    "statusCode": 400,
    "timestamp": "2026-08-23T12:00:00.000Z",
    "path": "/api/v1/auth/register",
    "message": "Validation failed",
    "errors": [
      "email must be a valid email address",
      "password must be 8-128 characters and include at least one uppercase letter, one lowercase letter, and one number"
    ]
  }
  ```

  For non-validation errors (e.g. `NotFoundException`), `errors` is omitted
  and `message` carries the original error message.

## Custom validators

Located in `src/common/validators/`:

- **`@IsStellarPublicKey()`** — validates that a string is a well-formed
  Stellar ed25519 public key (starts with `G`, 56 characters, valid
  checksum) using `StrKey.isValidEd25519PublicKey` from `@stellar/stellar-sdk`.
  Used on `UpdateUserDto.stellarPublicKey`.
- **`@IsPasswordStrong()`** — validates password strength: 8-128 characters,
  at least one uppercase letter, one lowercase letter, and one digit. Used
  on `CreateUserDto.password` and `ResetPasswordDto.newPassword`.

## Field-level rules by endpoint

### `POST /api/v1/auth/register` (`CreateUserDto`)
| Field | Rules |
|---|---|
| `email` | required, valid email format, max 254 chars |
| `username` | required, string, 3-30 chars, letters/numbers/underscore only |
| `password` | required, strong password (see above) |

### `POST /api/v1/auth/login` (`LoginDto`)
| Field | Rules |
|---|---|
| `email` | required, valid email format, max 254 chars |
| `password` | required, string, 8-128 chars |

### `POST /api/v1/auth/forgot-password` (`ForgotPasswordDto`)
| Field | Rules |
|---|---|
| `email` | required, valid email format, max 254 chars |

### `POST /api/v1/auth/reset-password` (`ResetPasswordDto`)
| Field | Rules |
|---|---|
| `token` | required, string, max 512 chars |
| `newPassword` | required, strong password (see above) |

### `POST /api/v1/auth/refresh` (`RefreshTokenDto`)
| Field | Rules |
|---|---|
| `refreshToken` | required, must be a valid JWT string |

### `PATCH /api/v1/users/me` (`UpdateUserDto`)
| Field | Rules |
|---|---|
| `username` | optional, string, 3-30 chars, letters/numbers/underscore only |
| `stellarPublicKey` | optional, valid Stellar ed25519 public key |

### `GET /api/v1/users/:id`, `GET /api/v1/challenges/:id`
Path `id` params are validated as UUID v4 via `ParseUUIDPipe`; a
non-UUID value returns `400 Bad Request`.

### `POST /api/v1/progress` (`RecordProgressDto`)
| Field | Rules |
|---|---|
| `challengeId` | required, valid UUID v4 |
| `activityType` | required, one of the `ActivityType` enum values |
| `score` | required, integer, `0 <= score <= 1,000,000` |
| `metadata` | optional, plain object |

### `GET /api/v1/progress/activity-log` (`ActivityLogQueryDto`)
| Field | Rules |
|---|---|
| `limit` | optional, integer, `1 <= limit <= 100` |

## Testing

Validators and DTOs have unit tests colocated with their source
(`*.spec.ts`), covering: valid input, empty strings, malformed/truncated
values, SQL-injection-style strings, extreme numeric values, and wrong
types. Run them with:

```bash
npm test
```
