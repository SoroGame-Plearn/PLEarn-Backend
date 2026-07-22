# JWT Refresh Token Mechanism

## Overview

This document describes the JWT refresh token implementation for the PLEarn Backend. Refresh tokens enable users to obtain new access tokens without re-entering their credentials, preventing unwanted logouts during long sessions while maintaining security.

## Architecture

### Token Types

The system uses two types of JWT tokens:

1. **Access Token** (short-lived)
   - Duration: 7 days (configurable via `JWT_EXPIRES_IN`)
   - Used to authenticate API requests
   - Sent in `Authorization: Bearer <accessToken>` header
   - Type claim: `access`

2. **Refresh Token** (long-lived)
   - Duration: 30 days (configurable via `JWT_REFRESH_EXPIRES_IN`)
   - Used only to request new access tokens
   - Stored in database with additional metadata
   - Type claim: `refresh`

### Token Rotation

The system implements **refresh token rotation** for enhanced security:

- When a refresh token is used to obtain a new access token, a new refresh token is also generated
- The old refresh token is invalidated
- This limits the window of exposure if a refresh token is compromised

### Revocation

Refresh tokens are revoked when:

- User logs out (`POST /auth/logout`)
- User's refresh token expires
- An invalid refresh token is detected during refresh attempt

## API Endpoints

### POST /auth/register

Register a new user and receive tokens.

**Request:**
```json
{
  "email": "user@example.com",
  "username": "username",
  "password": "password123"
}
```

**Response (201 Created):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "7d"
}
```

### POST /auth/login

Authenticate with email and password to receive tokens.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "7d"
}
```

### POST /auth/refresh

Request a new access token using a valid refresh token. This endpoint performs token rotation.

**Request:**
```
Authorization: Bearer <refreshToken>
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (new)",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (rotated)",
  "expiresIn": "7d"
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid or expired refresh token
- `401 Unauthorized` - Refresh token has been revoked
- `400 Bad Request` - Missing refreshToken in body

### POST /auth/logout

Revoke the refresh token and log out the user.

**Request:**
```
Authorization: Bearer <accessToken>
```

**Response (200 OK):**
```json
{
  "message": "Logged out successfully"
}
```

**Error Response:**

- `401 Unauthorized` - Invalid or missing access token

## Usage Flow

### Standard Login and Token Refresh

```
1. User Login
   POST /auth/login
   ├─ Returns: accessToken, refreshToken
   
2. Access API
   GET /api/v1/users/me
   Header: Authorization: Bearer <accessToken>
   ├─ Success: Returns user data
   
3. Access Token Expires
   GET /api/v1/users/me
   Header: Authorization: Bearer <accessToken (expired)>
   ├─ Error: 401 Unauthorized
   
4. Refresh Access Token
   POST /auth/refresh
   Header: Authorization: Bearer <refreshToken>
   Body: { "refreshToken": "..." }
   ├─ Returns: new accessToken, new refreshToken (rotated)
   
5. Resume Access
   GET /api/v1/users/me
   Header: Authorization: Bearer <newAccessToken>
   ├─ Success: Returns user data
   
6. User Logout
   POST /auth/logout
   Header: Authorization: Bearer <accessToken>
   ├─ Success: "Logged out successfully"
   └─ Old refreshToken is now revoked
```

### Attempting to Use Revoked Token

```
POST /auth/refresh
Header: Authorization: Bearer <revokedRefreshToken>
Body: { "refreshToken": "..." }
├─ Error: 401 Unauthorized - "Refresh token has been revoked"
```

## Database Schema

### User Entity Changes

The `users` table has three new columns:

```sql
ALTER TABLE users ADD COLUMN "refreshToken" varchar UNIQUE NULL;
ALTER TABLE users ADD COLUMN "refreshTokenExpiresAt" timestamp NULL;
ALTER TABLE users ADD COLUMN "isRefreshTokenRevoked" boolean DEFAULT false;
```

**Fields:**

- `refreshToken`: The hashed refresh token (unique to prevent reuse)
- `refreshTokenExpiresAt`: Expiration timestamp of the refresh token
- `isRefreshTokenRevoked`: Flag indicating if the token has been revoked

## Environment Variables

Add these variables to your `.env` file:

```bash
# JWT Configuration
JWT_SECRET=your_secure_secret_key_here
JWT_EXPIRES_IN=7d                          # Access token expiration (7 days default)

JWT_REFRESH_SECRET=your_refresh_secret_key_here
JWT_REFRESH_EXPIRES_IN=30d                 # Refresh token expiration (30 days default)
```

## Security Considerations

### Token Storage

- **Access Token**: Store in memory or sessionStorage (vulnerable to XSS if in localStorage)
- **Refresh Token**: Store securely (httpOnly cookie is recommended, or encrypted localStorage)

### Best Practices

1. **Use HTTPS**: Always transmit tokens over HTTPS to prevent interception
2. **Short Expiration**: Keep access token expiration short (7 days recommended)
3. **Long Expiration**: Refresh token can have longer expiration (30 days recommended)
4. **Token Rotation**: Always rotate refresh tokens to limit exposure
5. **Secure Storage**: Never store sensitive tokens in plain text
6. **Logout on Revocation**: Always call logout to revoke tokens when not needed
7. **Monitor Token Usage**: Implement logging to detect suspicious refresh patterns

### Token Validation

Tokens are validated for:

- Valid JWT signature
- Correct token type (access vs refresh)
- Expiration time
- Revocation status (for refresh tokens)
- Matching stored token in database (for refresh tokens)

## Error Handling

### Common Errors

| Status | Error | Cause | Solution |
|--------|-------|-------|----------|
| 401 | Invalid credentials | Wrong email/password | Verify credentials |
| 401 | Invalid refresh token | Token malformed | Re-login |
| 401 | Refresh token expired | Token past expiration | Re-login |
| 401 | Refresh token revoked | User logged out | Re-login |
| 401 | Token type mismatch | Using access token to refresh | Use refresh token for refresh endpoint |
| 400 | Missing refreshToken | Request body incomplete | Include refreshToken in body |
| 400 | Invalid email format | Email validation failed | Verify email format |

## Testing

### E2E Tests

Run the refresh token tests:

```bash
npm run test:e2e -- refresh-token.e2e-spec
```

### Test Coverage

The test suite covers:

- ✅ User registration with token generation
- ✅ User login with token generation
- ✅ Successful token refresh
- ✅ Invalid token rejection
- ✅ Expired token rejection
- ✅ Revoked token rejection
- ✅ Token rotation verification
- ✅ Logout functionality
- ✅ Multiple refresh cycles

## Migration Guide

### Upgrading Existing Deployment

1. **Update Environment Variables**
   ```bash
   JWT_REFRESH_SECRET=your_new_secret
   JWT_REFRESH_EXPIRES_IN=30d
   ```

2. **Run Database Migration**
   ```bash
   npm run migration:run
   ```

3. **Deploy New Code**
   - The new endpoints are available immediately
   - Old tokens continue to work
   - Existing users will receive refresh tokens on next login

### Backward Compatibility

- Old access tokens continue to work
- New refresh tokens are issued on login/register
- No breaking changes to existing endpoints

## Troubleshooting

### Refresh Token Not Working

**Problem:** `401 Unauthorized` on `/auth/refresh`

**Checklist:**
- [ ] Refresh token is not expired
- [ ] Refresh token is in the Authorization header
- [ ] RefreshToken is included in request body
- [ ] User has not logged out
- [ ] JWT_REFRESH_SECRET is correctly set

### Tokens Being Invalidated Unexpectedly

**Problem:** Refresh token suddenly becomes invalid

**Causes:**
- User logged out via `/auth/logout`
- Token expired (check `refreshTokenExpiresAt`)
- Database was reset or purged

### Duplicate Token Claims

**Problem:** Decoded tokens show multiple claims

**Solution:** Ensure you're using the correct secret for decoding:
- Access tokens: Decode with `JWT_SECRET`
- Refresh tokens: Decode with `JWT_REFRESH_SECRET`

## Future Enhancements

- [ ] Refresh token blacklist/whitelist for immediate revocation
- [ ] Device-specific refresh tokens for multi-device management
- [ ] Refresh token usage analytics and monitoring
- [ ] Automatic refresh on API calls to extend session
- [ ] WebSocket support with token refresh
- [ ] Sliding window token expiration

## References

- [RFC 6749 - OAuth 2.0 Authorization Framework](https://tools.ietf.org/html/rfc6749)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [NestJS JWT Documentation](https://docs.nestjs.com/security/authentication)
