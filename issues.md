# PLEarn Backend - GitHub Issues

## Core Architecture & Documentation

### 1. [Docs] Add comprehensive architecture diagram

**Description:**
Create a visual overview of the complete system architecture including NestJS API, PostgreSQL, Redis, and Stellar integration.

**Tasks:**
- Design and create an architecture diagram showing API layer, services, database, cache, and blockchain components
- Include data flow for key operations: user registration, challenge completion, reward evaluation, and Stellar distribution
- Document the interaction between each module (Auth, Users, Progress, Rewards, Challenges, Blockchain)
- Export diagram as SVG and add to README.md
- Create a separate architecture guide document with detailed component descriptions
- Establish process for keeping diagram up to date with major changes

**Labels:** `documentation`, `architecture`, `good-first-issue`

---

### 2. [Docs] Write API integration guide for frontend developers

**Description:**
Comprehensive guide for frontend developers to understand and integrate with the backend API.

**Tasks:**
- Document authentication flow with JWT token lifecycle and refresh strategy
- Create step-by-step guide for user registration and login
- Document the challenge completion workflow with example API calls and responses
- Explain reward evaluation timing and status transitions
- Provide code examples for common integration scenarios
- Include error handling and status code documentation
- Add postman collection or OpenAPI specification

**Labels:** `documentation`, `frontend-integration`, `good-first-issue`

---

### 3. [Docs] Create deployment guide for production

**Description:**
Step-by-step guide for deploying PLEarn Backend to production environments.

**Tasks:**
- Document environment setup and prerequisites (Node.js, PostgreSQL, Redis versions)
- Create checklist for production environment variables
- Include database initialization and migration procedures
- Document Stellar network configuration (testnet vs mainnet transition)
- Add security considerations (JWT secrets, API rate limiting setup)
- Create monitoring and logging recommendations
- Include backup and disaster recovery procedures
- Add troubleshooting guide for common issues

**Labels:** `documentation`, `deployment`, `operations`

---

## Authentication & Security

### 4. [Feature] Implement JWT refresh token mechanism

**Description:**
Add refresh token support to prevent users from being logged out during long sessions while maintaining security.

**Tasks:**
- Add refresh token field to User entity (unique, expiration date, revocation flag)
- Implement token refresh endpoint `POST /auth/refresh`
- Modify JWT strategy to handle both access and refresh tokens
- Add refresh token rotation mechanism
- Implement token revocation on logout
- Add tests for refresh token flow including edge cases
- Document refresh token lifecycle in API documentation

**Acceptance Criteria:**
- Users can request a new access token using a valid refresh token
- Refresh tokens expire after configurable duration (e.g., 30 days)
- Refresh tokens are revoked on logout
- Old refresh tokens are invalidated when new ones are issued

**Labels:** `authentication`, `security`, `backend`, `medium-complexity`

---

### 5. [Feature] Add email-based account recovery

**Description:**
Implement account recovery mechanism using email-based password reset.

**Tasks:**
- Add email service integration (SendGrid or similar)
- Create password reset token mechanism with expiration
- Implement `POST /auth/forgot-password` endpoint
- Implement `POST /auth/reset-password` endpoint with token validation
- Add email template for password reset link
- Implement rate limiting for password reset requests
- Add comprehensive tests including token expiration scenarios
- Document recovery flow and security considerations

**Acceptance Criteria:**
- Users receive password reset email with valid token
- Tokens expire after 1 hour
- Reset endpoint validates token before allowing password change
- Rate limiting prevents brute force attacks

**Labels:** `authentication`, `security`, `backend`, `medium-complexity`

---

### 6. [Refactor] Implement comprehensive input validation across all endpoints

**Description:**
Strengthen input validation for all API endpoints to prevent invalid data and security issues.

**Tasks:**
- Audit all DTOs for complete validation decorators
- Add custom validators for email format, Stellar public keys, password strength
- Implement global exception filter for validation errors
- Add validation for numeric fields (score ranges, rewards)
- Create validation error response standardization
- Add tests for validation edge cases (empty strings, SQL injection attempts, extreme values)
- Document validation rules and error messages

**Acceptance Criteria:**
- All endpoints reject invalid input with appropriate error messages
- Stellar public key format is validated
- Score values are within acceptable ranges
- Email addresses are validated properly

**Labels:** `security`, `refactor`, `backend`, `medium-complexity`

---

## User Management & Profiles

### 7. [Feature] Implement user profile picture upload

**Description:**
Allow users to upload and manage profile pictures with image optimization.

**Tasks:**
- Add profile picture URL field to User entity
- Implement image upload endpoint `POST /users/me/avatar`
- Integrate with cloud storage (AWS S3 or similar)
- Add image validation (size, format, dimensions)
- Implement image optimization (compression, resizing)
- Add profile picture retrieval in user profile endpoint
- Implement picture deletion functionality
- Add tests for various image formats and edge cases

**Acceptance Criteria:**
- Users can upload JPEG/PNG images up to 5MB
- Images are automatically optimized and stored
- Profile picture URL is returned in user profile
- Deletion removes picture from storage

**Labels:** `feature`, `users`, `backend`, `medium-complexity`

---

### 8. [Feature] Add user profile completion tracking

**Description:**
Track user profile completion status and guide users through the onboarding process.

**Tasks:**
- Add profile_completion_score field to User entity
- Create ProfileCompletion DTO with checklist items
- Implement completion status endpoint `GET /users/me/profile-completion`
- Track completed fields (bio, profile picture, Stellar key linkage)
- Add incentive for profile completion (achievement badge or bonus points)
- Implement profile completion notifications
- Add tests for completion calculation

**Acceptance Criteria:**
- Profile completion percentage is accurately calculated
- Users see clear next steps for profile completion
- Achievement triggered when profile reaches 100% completion

**Labels:** `feature`, `users`, `gamification`, `backend`, `low-complexity`

---

### 9. [Feature] Implement user preferences and settings management

**Description:**
Allow users to customize their experience through configurable preferences.

**Tasks:**
- Add UserPreferences entity (notifications enabled, theme preference, language)
- Create preferences endpoint `GET/PATCH /users/me/preferences`
- Implement email notification preferences
- Add language/locale selection
- Implement privacy settings (profile visibility, activity visibility)
- Add preference validation and defaults
- Create tests for preference updates
- Document user preferences in API guide

**Acceptance Criteria:**
- Users can enable/disable email notifications
- Language preference is respected in responses
- Privacy settings control data visibility
- Preferences persist across sessions

**Labels:** `feature`, `users`, `backend`, `low-complexity`

---

## Progress & Challenge System

### 10. [Feature] Implement challenge difficulty levels and adaptive scoring

**Description:**
Add difficulty levels to challenges and implement adaptive scoring based on user performance.

**Tasks:**
- Add difficulty_level field to Challenge entity (easy, medium, hard)
- Add base_score multiplier based on difficulty
- Implement time-to-completion scoring bonus
- Calculate adaptive difficulty based on user history
- Modify score calculation in progress service
- Add difficulty filter to challenges endpoint
- Implement tests for scoring calculation with various difficulty levels
- Update progress tracking to include difficulty metrics

**Acceptance Criteria:**
- Hard challenges award more XP than easy ones
- Faster completion awards bonus XP
- Users see difficulty indicators on challenges
- Scoring system is fair and transparent

**Labels:** `feature`, `challenges`, `gamification`, `backend`, `high-complexity`

---

### 11. [Feature] Add challenge categories and filtering

**Description:**
Organize challenges into categories and provide advanced filtering options.

**Tasks:**
- Create ChallengeCategory entity (name, description, icon)
- Add category relationship to Challenge entity
- Add tags field to Challenge entity for flexible categorization
- Implement category endpoint `GET /challenges/categories`
- Modify challenges list endpoint to support filtering by category, tags, difficulty
- Add pagination and sorting options
- Implement Redis caching for filtered results
- Add comprehensive tests for filtering combinations

**Acceptance Criteria:**
- Users can filter challenges by category
- Multiple tag filtering works with AND/OR logic
- Results are paginated and sorted
- Caching improves response time

**Labels:** `feature`, `challenges`, `backend`, `medium-complexity`

---

### 12. [Feature] Implement challenge prerequisites and progression system

**Description:**
Create a challenge progression tree where users must complete prerequisites before accessing advanced challenges.

**Tasks:**
- Add prerequisites field to Challenge entity (array of challenge IDs)
- Add completion tracking for each user-challenge pair
- Modify challenge retrieval to check user eligibility
- Implement progression endpoint `GET /users/me/progression`
- Add progression visualization data
- Implement cascade validation for prerequisites
- Add tests for complex prerequisite chains
- Document progression system

**Acceptance Criteria:**
- Users can only access challenges they have prerequisites for
- Completion unlocks subsequent challenges
- API indicates locked challenges and required prerequisites
- No circular dependencies possible

**Labels:** `feature`, `challenges`, `gamification`, `backend`, `high-complexity`

---

### 13. [Feature] Add activity log filtering and search

**Description:**
Enhance activity log retrieval with filtering, searching, and better date range handling.

**Tasks:**
- Add activity type filter (challenge_completed, reward_distributed, profile_updated)
- Implement date range filtering (last 7 days, last month, custom range)
- Add search functionality for activity metadata
- Implement sorting options (newest, oldest, by score)
- Add pagination with configurable page size
- Implement efficient database queries with indexes
- Add tests for various filter combinations
- Document filtering options in API guide

**Acceptance Criteria:**
- Users can filter activity by type and date
- Search returns relevant results
- Performance is good even with large activity logs
- Filters can be combined

**Labels:** `feature`, `progress`, `backend`, `medium-complexity`

---

### 14. [Refactor] Extract and document challenge scoring business logic

**Description:**
Centralize and document all scoring calculation logic for maintainability and testability.

**Tasks:**
- Create ScoringEngine service with all scoring calculations
- Document scoring algorithm including difficulty multipliers, time bonuses
- Extract scoring logic from progress service
- Create comprehensive unit tests for all scoring scenarios
- Add edge case handling (zero scores, maximum values)
- Create documentation explaining scoring formula
- Add configuration for adjusting scoring parameters
- Implement scoring audit logging

**Acceptance Criteria:**
- All scoring logic in one place
- Scoring is fully tested
- Formula is documented
- Easy to adjust scoring parameters

**Labels:** `refactor`, `backend`, `technical-debt`, `medium-complexity`

---

## Reward System & Blockchain

### 15. [Feature] Implement Soroban smart contract integration

**Description:**
Replace direct Horizon payments with Soroban smart contract-based reward distribution.

**Tasks:**
- Deploy Soroban contract for reward distribution
- Update blockchain service to use Soroban RPC
- Implement contract invocation for reward transfers
- Add contract address validation
- Handle contract failures and retries
- Implement contract event monitoring
- Add comprehensive tests for contract interaction
- Update documentation with contract details
- Add migration guide from Horizon to Soroban

**Acceptance Criteria:**
- Rewards distributed via Soroban contract
- Contract is deployed on testnet and mainnet
- Error handling works correctly
- Transaction costs are monitored

**Labels:** `blockchain`, `soroban`, `backend`, `high-complexity`

---

### 16. [Feature] Add reward history and analytics

**Description:**
Provide detailed reward history and analytics for users and administrators.

**Tasks:**
- Enhance Reward entity with additional fields (initial_amount, final_amount, gas_cost, contract_address)
- Create reward statistics endpoint `GET /users/me/rewards/stats`
- Implement reward distribution trends (daily, weekly, monthly)
- Add cumulative XLM earned tracking
- Create admin endpoint for global reward metrics
- Add filtering by date range and status
- Implement caching for analytics queries
- Add comprehensive tests

**Acceptance Criteria:**
- Users see detailed reward history
- Statistics show distribution trends
- Analytics are accurate and performant
- Admin dashboard has access to global metrics

**Labels:** `feature`, `rewards`, `analytics`, `backend`, `medium-complexity`

---

### 17. [Feature] Implement reward retry mechanism with exponential backoff

**Description:**
Add robust retry logic for failed reward distributions to ensure XLM reaches users.

**Tasks:**
- Implement exponential backoff retry strategy
- Add retry_count and last_retry_timestamp fields to Reward entity
- Create retry queue mechanism
- Implement scheduled job for processing failed rewards
- Add maximum retry limit with logging
- Implement circuit breaker pattern for blockchain failures
- Add monitoring for retry statistics
- Create comprehensive tests for retry scenarios

**Acceptance Criteria:**
- Failed rewards are automatically retried
- Retries use exponential backoff
- Maximum of N retries before marking as failed
- System logs all retry attempts
- Circuit breaker prevents cascading failures

**Labels:** `feature`, `rewards`, `reliability`, `backend`, `high-complexity`

---

### 18. [Feature] Add Stellar transaction monitoring and reconciliation

**Description:**
Implement transaction monitoring to ensure all rewards are properly distributed and reconciled.

**Tasks:**
- Create transaction monitoring job that polls Stellar network
- Implement reconciliation logic to match on-chain transactions with Reward records
- Add TransactionLog entity for audit trail
- Create endpoint to check transaction status `GET /rewards/:rewardId/transaction-status`
- Implement anomaly detection for suspicious patterns
- Add reconciliation reporting for admins
- Create alerts for failed or missing transactions
- Add comprehensive tests for monitoring logic

**Acceptance Criteria:**
- All distributed rewards are tracked on-chain
- Discrepancies are detected and logged
- Admin dashboard shows reconciliation status
- Alert system notifies on anomalies

**Labels:** `feature`, `blockchain`, `reliability`, `backend`, `high-complexity`

---

## Performance, Caching & Infrastructure

### 19. [Feature] Implement multi-level caching strategy

**Description:**
Optimize API performance through intelligent multi-level caching.

**Tasks:**
- Implement application-level caching (entity results)
- Add distributed caching for shared data (challenges, leaderboard)
- Implement cache invalidation strategies
- Add cache statistics endpoint `GET /system/cache-stats`
- Create cache warming strategy for popular data
- Add cache expiration configuration by endpoint
- Implement cache bypass for real-time data
- Add comprehensive tests for cache behavior
- Document caching strategy

**Acceptance Criteria:**
- High-read endpoints are cached
- Cache is properly invalidated on data changes
- Response times improved significantly
- Cache hit rates are monitored

**Labels:** `performance`, `caching`, `backend`, `medium-complexity`

---

### 20. [Refactor] Implement database connection pooling optimization

**Description:**
Optimize database connection handling for better performance and resource usage.

**Tasks:**
- Configure TypeORM connection pool parameters
- Add connection pool metrics
- Implement idle connection cleanup
- Test and tune pool size for expected load
- Add monitoring for connection pool status
- Document optimal pool configuration
- Create performance benchmarks
- Add tests for connection handling under load

**Acceptance Criteria:**
- Connection pool properly sized
- Metrics show healthy pool utilization
- No connection exhaustion issues under load
- Performance improved with proper pooling

**Labels:** `performance`, `infrastructure`, `backend`, `medium-complexity`

---

### 21. [Feature] Add request logging and tracing

**Description:**
Implement comprehensive request logging and distributed tracing for debugging and monitoring.

**Tasks:**
- Implement request ID generation and propagation
- Add detailed request/response logging
- Integrate with distributed tracing system (e.g., Jaeger)
- Log blockchain transaction traces
- Add performance metrics collection
- Implement correlation IDs for related requests
- Add sensitive data masking in logs
- Create endpoint for accessing logs `GET /system/logs`
- Add comprehensive tests

**Acceptance Criteria:**
- All requests have unique IDs for tracking
- Response times are logged
- Blockchain operations are traceable
- Logs can be filtered by request ID
- Sensitive data is never logged

**Labels:** `observability`, `logging`, `backend`, `medium-complexity`

---

### 22. [Feature] Implement API rate limiting

**Description:**
Add rate limiting to prevent abuse and ensure fair resource usage.

**Tasks:**
- Implement global rate limiter middleware
- Add per-user rate limits (different limits for different endpoints)
- Implement IP-based rate limiting for unauthenticated endpoints
- Add rate limit headers to responses
- Create admin endpoint to configure rate limits
- Add rate limit bypass for admin users
- Implement rate limit analytics
- Add comprehensive tests including edge cases

**Acceptance Criteria:**
- Unauthenticated endpoints limited to 100 req/min
- Authenticated endpoints limited to 1000 req/min
- Rate limits returned in response headers
- Exceeded limits return 429 status

**Labels:** `feature`, `security`, `backend`, `medium-complexity`

---

## Testing & Quality

### 23. [Test] Implement comprehensive unit test suite for Rewards service

**Description:**
Create thorough unit tests for the Rewards service covering all scoring scenarios.

**Tasks:**
- Test all reward tier calculations (100+, 50+, 10+, <10)
- Test edge cases (exactly 100, boundary values)
- Test with missing user Stellar key
- Test concurrent reward evaluations
- Mock blockchain service interactions
- Test error handling and logging
- Achieve 90%+ code coverage for service
- Add performance benchmarks for reward evaluation
- Document test scenarios

**Acceptance Criteria:**
- 90%+ code coverage
- All reward calculations tested
- Edge cases handled
- Performance acceptable

**Labels:** `testing`, `quality`, `backend`, `good-first-issue`

---

### 24. [Test] Implement E2E test suite for user authentication flow

**Description:**
Create end-to-end tests for complete authentication workflows.

**Tasks:**
- Test registration with valid and invalid data
- Test login with correct and incorrect credentials
- Test JWT token validation
- Test token expiration and refresh
- Test unauthorized access handling
- Test password reset flow
- Test logout and token revocation
- Use test database for isolation
- Create test data factories
- Document test scenarios

**Acceptance Criteria:**
- All auth endpoints tested end-to-end
- Valid and invalid scenarios covered
- Database state properly managed
- Tests are fast and reliable

**Labels:** `testing`, `quality`, `backend`, `medium-complexity`

---

### 25. [Test] Add integration tests for blockchain operations

**Description:**
Create integration tests for Stellar blockchain interactions.

**Tasks:**
- Test reward distribution to valid Stellar account
- Test handling of invalid public keys
- Test transaction failure scenarios
- Test retry mechanism behavior
- Mock Stellar Horizon API responses
- Test with testnet configuration
- Add performance benchmarks for blockchain calls
- Create fixtures for common Stellar responses
- Document test setup requirements

**Acceptance Criteria:**
- Blockchain integration thoroughly tested
- Mocking prevents testnet/mainnet calls
- All failure modes covered
- Performance acceptable

**Labels:** `testing`, `quality`, `blockchain`, `backend`, `high-complexity`

---

### 26. [Test] Implement database migration testing

**Description:**
Create automated tests for all database migrations.

**Tasks:**
- Test forward migrations (upgrade path)
- Test rollback migrations (downgrade path)
- Verify data preservation through migrations
- Test with realistic data volumes
- Test migration performance
- Verify schema constraints are applied
- Create reusable test utilities for migrations
- Document migration testing process
- Add to CI/CD pipeline

**Acceptance Criteria:**
- All migrations tested forward and backward
- Data integrity verified
- Performance acceptable for large datasets
- Zero data loss

**Labels:** `testing`, `quality`, `database`, `backend`, `medium-complexity`

---

## Monitoring, Analytics & Admin Features

### 27. [Feature] Implement comprehensive admin dashboard endpoints

**Description:**
Create admin APIs to monitor system health and user activity.

**Tasks:**
- Create AdminGuard for role-based access control
- Add admin role to User entity
- Implement `/admin/stats` endpoint (total users, challenges completed, rewards distributed)
- Implement `/admin/users` endpoint with filtering and sorting
- Implement `/admin/rewards/summary` endpoint
- Implement `/admin/system-health` endpoint (DB, Redis, Stellar network status)
- Add audit log for admin actions
- Implement rate limiting for admin endpoints
- Add comprehensive tests
- Document admin API endpoints

**Acceptance Criteria:**
- Admins see system-wide statistics
- Admin actions are audited
- API performance acceptable
- Access control enforced

**Labels:** `feature`, `admin`, `monitoring`, `backend`, `high-complexity`

---

### 28. [Feature] Implement user analytics and engagement metrics

**Description:**
Track and expose user engagement metrics for analytics and insights.

**Tasks:**
- Add user engagement fields (last_login, challenges_completed_count, total_xp_earned)
- Create engagement metrics endpoint `GET /users/me/metrics`
- Implement challenge completion rate calculation
- Calculate average score per challenge
- Track daily active users (DAU) and monthly active users (MAU)
- Implement user cohort analysis
- Create retention metrics
- Add optional analytics dashboard data
- Add tests for metric calculations

**Acceptance Criteria:**
- Users see personal engagement metrics
- Metrics are accurate and updated
- Performance acceptable even with large user base
- Data privacy respected

**Labels:** `feature`, `analytics`, `backend`, `medium-complexity`

---

## Documentation & Developer Experience

### 29. [Docs] Create database schema documentation

**Description:**
Provide comprehensive documentation of database entities, relationships, and schema.

**Tasks:**
- Generate ER diagram showing all entities and relationships
- Document each entity with field descriptions and constraints
- Explain foreign key relationships
- Document indexes and why they exist
- Add sequence diagrams for key workflows
- Create data flow documentation for each major feature
- Document backup and recovery procedures
- Add migration strategy documentation
- Keep documentation up to date with schema changes

**Acceptance Criteria:**
- ER diagram accurately represents schema
- All entities documented
- Relationships clearly explained
- Easy for new developers to understand

**Labels:** `documentation`, `database`, `good-first-issue`

---

### 30. [Docs] Implement comprehensive API documentation with OpenAPI/Swagger

**Description:**
Generate and maintain OpenAPI/Swagger documentation for all API endpoints.

**Tasks:**
- Install and configure Swagger/OpenAPI generation tools
- Document all endpoints with request/response schemas
- Add example requests and responses
- Document error codes and messages
- Add authentication requirements for each endpoint
- Generate interactive Swagger UI
- Create client SDK generation setup
- Add validation rules and constraints to documentation
- Keep documentation synchronized with code
- Create runnable examples

**Acceptance Criteria:**
- All endpoints documented
- Swagger UI accessible
- Examples are accurate and runnable
- Auto-generated from code annotations

**Labels:** `documentation`, `developer-experience`, `good-first-issue`

---

## Known Issues & Technical Debt

### Additional Context

These issues represent the core roadmap items from the project README plus additional complex backend features that would make the platform robust, scalable, and maintainable. Issues are categorized by:

- **Complexity**: Good for first-time contributors can start with `good-first-issue` tagged items
- **Impact**: High-complexity items provide significant value (blockchain integration, performance optimization, admin features)
- **Dependencies**: Some features depend on others being completed first (e.g., Soroban integration depends on issue #15)
- **Timeline**: Recommend prioritizing:
  1. Security and auth improvements (issues #4-6)
  2. Core blockchain features (issues #15-18)
  3. Performance and scaling (issues #19-22)
  4. Testing and quality (issues #23-26)
  5. Admin and monitoring (issues #27-28)
  6. Documentation (issues #29-30)

### Priority Matrix

**High Priority + High Complexity** (Start first):
- #4: JWT Refresh Tokens
- #15: Soroban Integration
- #17: Reward Retry Mechanism
- #27: Admin Dashboard

**Medium Priority + Medium Complexity** (Start after high priority):
- #10: Difficulty Levels
- #12: Challenge Prerequisites
- #16: Reward Analytics
- #24: E2E Auth Tests

**Lower Priority or Good First Issues**:
- #1: Architecture Diagram
- #2: API Integration Guide
- #23: Unit Tests for Rewards
- #29: Database Schema Docs
- #30: OpenAPI Documentation

---

**Legend:**
- `backend` - Backend-focused work
- `blockchain` - Stellar/blockchain integration
- `feature` - New feature implementation
- `refactor` - Code refactoring/technical debt
- `test` - Testing-related
- `documentation` - Documentation work
- `good-first-issue` - Suitable for new contributors
- `security` - Security improvements
- `performance` - Performance optimizations
- `high-complexity` - Significant technical complexity
- `medium-complexity` - Moderate complexity
- `low-complexity` - Suitable for new developers
