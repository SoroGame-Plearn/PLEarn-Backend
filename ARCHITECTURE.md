# PLEarn Backend Architecture Guide

## Table of Contents

- [System Overview](#system-overview)
- [Architecture Layers](#architecture-layers)
- [Module Descriptions](#module-descriptions)
- [Data Flow Diagrams](#data-flow-diagrams)
- [Component Interactions](#component-interactions)
- [Technology Stack Details](#technology-stack-details)
- [Deployment Architecture](#deployment-architecture)
- [Scalability Considerations](#scalability-considerations)
- [Monitoring and Observability](#monitoring-and-observability)
- [Architecture Evolution](#architecture-evolution)

---

## System Overview

PLEarn Backend is a NestJS-based microservice architecture designed to manage user progression, challenge completion tracking, and blockchain-based reward distribution on the Stellar network. The system is built with scalability, security, and maintainability as core principles.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Applications                       │
│                   (Web, Mobile, Desktop)                         │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NestJS REST API Server                        │
│              (Node.js Runtime on Port 3000)                      │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  Auth Module │  │ Users Module │  │ Progress     │           │
│  │              │  │              │  │ Module       │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ Rewards      │  │ Challenges   │  │ Blockchain   │           │
│  │ Module       │  │ Module       │  │ Module       │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
└──────────────────────────┬──────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
   ┌─────────┐        ┌─────────┐        ┌─────────┐
   │PostgreSQL       │  Redis  │        │ Stellar │
   │ Database        │  Cache  │        │ Network │
   │                 │         │        │         │
   │ • Users         │ • Challenges    │ • Testnet/Mainnet
   │ • Challenges    │ • Sessions      │ • Horizon API
   │ • Progress      │ • Auth Tokens   │ • Soroban RPC
   │ • Rewards       │                 │
   │ • Audit Logs    │                 │
   └─────────┘        └─────────┘        └─────────┘
```

---

## Architecture Layers

### 1. Presentation Layer (API Layer)

**Responsibility:** HTTP request handling, routing, and response formatting.

**Components:**
- Controllers (e.g., `AuthController`, `UsersController`, `RewardsController`)
- DTOs (Data Transfer Objects) for request/response validation
- Pipes for global data transformation

**Key Files:**
```
src/
├── auth/auth.controller.ts
├── users/users.controller.ts
├── progress/progress.controller.ts
├── rewards/rewards.controller.ts
├── challenges/challenges.controller.ts
```

**Characteristics:**
- RESTful endpoint design
- All routes prefixed with `/api/v1`
- JWT authentication via `JwtAuthGuard`
- Input validation via class-validator decorators
- Global exception filters for consistent error responses

---

### 2. Application Layer (Business Logic)

**Responsibility:** Core business logic, orchestration, and workflows.

**Components:**
- Services (e.g., `AuthService`, `UsersService`, `ProgressService`)
- Repositories (via TypeORM entities)
- Guards and Decorators for cross-cutting concerns

**Key Services:**

#### AuthService
- JWT token generation and validation
- User registration and login
- Refresh token management (future)
- Password reset workflows (future)

#### UsersService
- User profile management
- Stellar wallet linkage
- Profile completion tracking (future)
- User preferences management (future)

#### ProgressService
- Challenge completion recording
- Activity logging
- Progress aggregation
- Triggers reward evaluation

#### RewardsService
- Reward evaluation based on scoring tiers
- Reward status management (pending, distributed, failed)
- Reward history tracking
- Analytics and statistics

#### ChallengesService
- Challenge catalogue management
- Filtering and searching
- Redis-based caching for high-read performance
- Category and tag management (future)

#### BlockchainService
- Stellar SDK integration
- XLM payment distribution
- Transaction monitoring
- Error handling and retries (future)

---

### 3. Data Access Layer (Persistence)

**Responsibility:** Database interaction and data persistence.

**Components:**
- TypeORM Entities
- TypeORM Repositories
- Database migrations
- Query builders

**Key Entities:**
```
User
├── id (UUID)
├── email (unique)
├── username
├── password (hashed)
├── stellar_public_key (optional)
└── created_at, updated_at

Challenge
├── id (UUID)
├── title
├── description
├── difficulty_level (future)
└── created_at, updated_at

Progress
├── id (UUID)
├── user_id (FK)
├── challenge_id (FK)
├── score
├── completed_at
└── metadata

Reward
├── id (UUID)
├── user_id (FK)
├── amount_xlm
├── status (pending, distributed, failed)
├── transaction_hash (optional)
└── created_at, updated_at
```

---

### 4. Integration Layer (External Services)

**Responsibility:** Integration with external systems and APIs.

**Components:**
- BlockchainService for Stellar integration
- Third-party service clients (future: Email, Cloud Storage)

**External Systems:**
- Stellar Horizon API (testnet/mainnet)
- Stellar Soroban RPC (future smart contracts)
- Redis (caching layer)

---

## Module Descriptions

### Auth Module

**Purpose:** Handle user authentication and authorization.

**Endpoints:**
```
POST /auth/register        - User registration
POST /auth/login           - User login (returns JWT)
POST /auth/refresh         - Refresh access token (future)
POST /auth/logout          - Logout and revoke token (future)
POST /auth/forgot-password - Password reset request (future)
```

**Flow:**
1. User submits credentials
2. AuthService validates and creates user/authenticates
3. JWT token generated with user ID and email
4. Token returned to client
5. Client includes token in `Authorization: Bearer <token>` header

**Security:**
- Passwords hashed with bcrypt
- JWT signed with HS256
- JWT expiration: 7 days (configurable)
- Rate limiting on login attempts (future)

---

### Users Module

**Purpose:** Manage user profiles and preferences.

**Endpoints:**
```
GET /users/me              - Get current user profile
PATCH /users/me            - Update profile (username, Stellar key)
GET /users/:id             - Get user profile by ID
```

**Key Fields:**
- Basic info (email, username, created_at)
- Stellar wallet linkage (stellar_public_key)
- Profile completion tracking (future)
- Preferences and settings (future)

---

### Progress Module

**Purpose:** Track user challenge completion and activity.

**Endpoints:**
```
POST /progress             - Record challenge completion
GET /progress              - Get all completed challenges
GET /progress/activity-log - Get recent activity (paginated)
```

**Workflow:**
1. User completes challenge via frontend
2. POST to `/progress` with challengeId and score
3. ProgressService records entry in database
4. Activity log entry created
5. RewardsService.evaluateReward() triggered
6. Response includes new score and any rewards earned

---

### Challenges Module

**Purpose:** Manage challenge catalogue and metadata.

**Endpoints:**
```
GET /challenges            - List all challenges (cached)
GET /challenges/:id        - Get single challenge details
```

**Caching Strategy:**
- Redis TTL: 5 minutes
- Cache invalidated on challenge updates
- Future: Extend to category and tag filtering

---

### Rewards Module

**Purpose:** Manage reward evaluation and distribution.

**Endpoints:**
```
GET /rewards               - Get current user's rewards
GET /rewards/stats         - Get reward statistics (future)
```

**Reward Tiers:**
```
Score ≥ 100 → 10 XLM
Score ≥ 50  → 5 XLM
Score ≥ 10  → 1 XLM
Score < 10  → No reward
```

**Status Transitions:**
```
pending → distributed → completed
    ↓
  failed (with retry)
```

---

### Blockchain Module

**Purpose:** Handle Stellar network interactions.

**Key Function:**
- `distributeReward(userId, amountXlm)` - Send XLM via Horizon

**Process:**
1. Get user's Stellar public key from database
2. Create payment transaction
3. Sign with distributor account secret key
4. Submit to Stellar Horizon network
5. Monitor transaction status
6. Update Reward record with transaction hash

---

## Data Flow Diagrams

### User Registration Flow

```
┌──────────┐
│ Frontend │
└────┬─────┘
     │ POST /auth/register
     │ {email, password, username}
     ▼
┌──────────────────┐
│ AuthController   │
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│ AuthService      │  1. Hash password
├──────────────────┤  2. Check email unique
│ - register()     │  3. Create User entity
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│ UserRepository   │
│ (TypeORM)        │
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│ PostgreSQL       │
│ users table      │
└──────────────────┘
     │
     ◄─ Return created user
     │
     ▼
┌──────────────────┐
│ AuthService      │  Generate JWT token
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│ AuthController   │
└────┬─────────────┘
     │ Return {accessToken, user}
     ▼
┌──────────────────┐
│ Frontend         │
│ (Stores Token)   │
└──────────────────┘
```

### Challenge Completion & Reward Flow

```
┌──────────┐
│ Frontend │
└────┬─────┘
     │ POST /progress
     │ {challengeId, score, metadata}
     ▼
┌──────────────────────┐
│ ProgressController   │
└────┬─────────────────┘
     │ Extract userId from JWT
     ▼
┌──────────────────────┐
│ ProgressService      │
├──────────────────────┤
│ 1. Validate challenge
│ 2. Calculate base score
│ 3. Create Progress record
│ 4. Log activity
└────┬─────────────────┘
     │
     ▼
┌──────────────────────┐
│ PostgreSQL           │
│ progress table       │
└────┬─────────────────┘
     │
     ▼
┌──────────────────────┐
│ RewardsService       │
├──────────────────────┤
│ evaluateReward()     │
│ 1. Get user score    │
│ 2. Check tier        │
│ 3. Determine XLM amt │
│ 4. Get Stellar key   │
└────┬─────────────────┘
     │
     ▼ (If eligible and key exists)
┌──────────────────────┐
│ BlockchainService    │
├──────────────────────┤
│ distributeReward()   │
│ 1. Build transaction │
│ 2. Sign with privkey │
│ 3. Submit to Horizon │
└────┬─────────────────┘
     │
     ▼
┌──────────────────────┐
│ Stellar Horizon API  │
│ (Testnet/Mainnet)    │
└────┬─────────────────┘
     │
     ▼
┌──────────────────────┐
│ Stellar Network      │
│ XLM Transfer         │
└────┬─────────────────┘
     │ tx_hash
     ▼
┌──────────────────────┐
│ RewardsService       │
│ Update reward status │
│ → 'distributed'      │
└──────────────────────┘
     │
     ▼
┌──────────────────────┐
│ Return to Frontend   │
│ {progress, reward}   │
└──────────────────────┘
```

### Challenge Listing with Caching Flow

```
┌──────────────────────┐
│ Frontend             │
└────┬─────────────────┘
     │ GET /challenges
     ▼
┌──────────────────────┐
│ ChallengesController │
└────┬─────────────────┘
     │
     ▼
┌──────────────────────┐
│ ChallengesService    │
│ findAll()            │
└────┬─────────────────┘
     │
     ▼
┌──────────────────────┐ (Check cache first)
│ Redis Cache          │
│ key: 'challenges'    │
└──┬───────────────────┘
   │
   ▼ Cache HIT?
  ┌──────────────────────────┐
  │ Return cached challenges │
  └──┬───────────────────────┘
     │
     ▼
┌──────────────────────┐
│ ChallengesController │
└────┬─────────────────┘
     │ Response
     ▼
┌──────────────────────┐
│ Frontend             │
└──────────────────────┘

           OR

  Cache MISS?
  │
  ▼
┌──────────────────────┐
│ PostgreSQL           │
│ SELECT challenges    │
└────┬─────────────────┘
     │ Return challenges
     ▼
┌──────────────────────┐
│ Redis Cache          │
│ SET (TTL: 5min)      │
└────┬─────────────────┘
     │
     ▼
┌──────────────────────┐
│ ChallengesController │
│ Return challenges    │
└────┬─────────────────┘
     │
     ▼
┌──────────────────────┐
│ Frontend             │
└──────────────────────┘
```

---

## Component Interactions

### Module Dependency Graph

```
┌─────────────┐
│ Auth Module │◄──────────────────────┐
└─────────────┘                        │
      │                                │
      ├─► ┌─────────────┐              │
      │   │ Users       │      (JWT Validation)
      │   │ Repository  │              │
      │   └─────────────┘              │
      │                                │
      └────────────┬────────────────────┤
                   │                    │
         ┌─────────▼────────┐           │
         │ ProgressModule   │───────────┤
         └──────┬──────┬────┘           │
                │      │               │
      ┌─────────▼──┐   │     ┌────────────────┐
      │ Progress   │   │     │ Rewards Module │
      │ Service    │   │     └────┬───────────┘
      └────────────┘   │          │
                       │     ┌────▼──────────┐
                       │     │ Blockchain   │
                       │     │ Module       │
                       │     └──────────────┘
                       │
           ┌───────────▼──────────┐
           │ Challenges Module    │
           │ (With Redis caching) │
           └──────────────────────┘
```

### Data Flow Between Modules

**Auth Module → Users Module**
- After successful login/register, user data flows to session
- User ID embedded in JWT for subsequent requests

**Progress Module → Rewards Module**
- When progress is recorded, RewardsService is triggered
- Score is passed for reward tier evaluation

**Rewards Module → Blockchain Module**
- When reward is created, BlockchainService is called
- User's Stellar key and XLM amount passed for distribution

**Challenges Module → Progress Module**
- Challenge metadata is retrieved during progress recording
- Challenge ID validated before accepting completion

**All Modules ← Auth Module**
- JwtAuthGuard validates token on all protected endpoints
- User ID extracted from JWT payload

---

## Technology Stack Details

### Backend Framework
- **NestJS 10.x** - Node.js framework with TypeScript
- **Express** - Underlying HTTP framework (via NestJS)

### Database & Persistence
- **PostgreSQL 15+** - Primary data store
- **TypeORM 0.3.x** - ORM for database operations
- **Migrations** - Versioned schema changes

### Caching
- **Redis 7+** - In-memory caching layer
- **cache-manager** - Caching abstraction library

### Authentication
- **Passport.js** - Authentication middleware
- **@nestjs/jwt** - JWT handling
- **bcrypt** - Password hashing

### Blockchain
- **stellar-sdk** - Official Stellar JavaScript SDK
- **Horizon API** - Stellar payment submission
- **Soroban RPC** - Future smart contract integration

### Validation & Transformation
- **class-validator** - Decorator-based validation
- **class-transformer** - DTO transformation

### Development Tools
- **TypeScript** - Static type checking
- **Jest** - Unit and integration testing
- **Swagger/OpenAPI** - API documentation (future)

---

## Deployment Architecture

### Development Environment

```
Developer Machine
├── Node.js v20+
├── PostgreSQL (local or Docker)
├── Redis (local or Docker)
└── Environment variables (.env)
```

### Production Environment

```
┌──────────────────────────────────┐
│ Load Balancer (SSL/TLS)          │
└────────────────┬─────────────────┘
                 │
    ┌────────────┼────────────┐
    ▼            ▼            ▼
┌─────────┐ ┌─────────┐ ┌─────────┐
│ NestJS  │ │ NestJS  │ │ NestJS  │
│ Instance│ │ Instance│ │ Instance│
│ (Port   │ │ (Port   │ │ (Port   │
│ 3000)   │ │ 3000)   │ │ 3000)   │
└────┬────┘ └────┬────┘ └────┬────┘
     │           │           │
     └───────────┼───────────┘
                 │
                 ▼
        ┌─────────────────────┐
        │ PostgreSQL Cluster  │
        │ (Primary + Replicas)│
        └─────────────────────┘
                 │
     ┌───────────┴───────────┐
     ▼                       ▼
┌──────────────┐    ┌──────────────┐
│ Redis        │    │ Monitoring   │
│ (Sentinel)   │    │ (Prometheus, │
└──────────────┘    │  Grafana)    │
                    └──────────────┘
```

### Stellar Network Integration

```
PLEarn Backend
     │
     ├─► Stellar Testnet (Development)
     │   └─ https://horizon-testnet.stellar.org
     │   └─ Friendbot for funding test accounts
     │
     └─► Stellar Mainnet (Production)
         └─ https://horizon.stellar.org
         └─ Real XLM transfers
```

---

## Scalability Considerations

### Current Implementation
- Single NestJS instance
- PostgreSQL single primary
- Redis single instance
- Suitable for: < 10,000 concurrent users

### Near-term Scalability (1-2 years)

**Horizontal Scaling:**
- Multiple NestJS instances behind load balancer
- Database replication (read replicas)
- Redis cluster for distributed caching
- Message queue (RabbitMQ/Redis) for async operations

**Optimization:**
- Database indexing on frequently queried fields
- Query optimization and pagination
- Connection pooling optimization
- Caching layer expansion

### Long-term Architecture (2+ years)

**Microservices:**
- Separate Auth Service
- Dedicated Rewards Distribution Service
- Challenge Management Service
- Analytics Service

**Event-Driven:**
- Event streaming (Kafka) for user progression
- Async reward processing
- Real-time notifications

**Data:**
- Database sharding by user ID ranges
- Data warehouse for analytics
- Cache invalidation strategies

---

## Monitoring and Observability

### Logging
- Structured logging to stdout (for container logging)
- Request ID correlation
- Sensitive data masking (passwords, keys)
- Log levels: error, warn, info, debug

### Metrics
- API response time histogram
- Request count by endpoint
- Error rate tracking
- Database query performance
- Cache hit/miss rates
- Blockchain transaction success rates

### Health Checks
- Database connectivity
- Redis availability
- Stellar network accessibility
- Application startup verification

### Alerting (Future)
- High error rate (> 5%)
- Database connection exhaustion
- Redis memory usage
- Reward distribution failures
- Blockchain transaction delays

---

## Architecture Evolution

### Process for Updating Architecture

1. **Document Changes**
   - Update ARCHITECTURE.md with new components/flows
   - Add diagrams for new features

2. **Version Control**
   - Keep architecture docs in git
   - Require architecture review for major changes
   - Tag releases with architecture version

3. **Communication**
   - Share updates in team documentation
   - Document migration paths for API changes
   - Maintain backward compatibility when possible

4. **Testing**
   - Test new architecture patterns locally first
   - Integration tests before production
   - Load testing for scalability changes

### Recent and Planned Evolution

**Current (Phase 1):**
- JWT authentication
- Basic challenge tracking
- Direct Horizon-based rewards

**Q4 2026 (Phase 2):**
- Soroban smart contract integration
- Reward retry mechanism
- User profile pictures

**2027 (Phase 3):**
- Microservices separation
- Event streaming
- Analytics platform

---

## How to Contribute

When adding new features:

1. **Identify which module(s) are affected**
2. **Update this document with:**
   - New endpoints/services
   - Data flow changes
   - Database schema additions
3. **Add diagrams if workflow changes significantly**
4. **Update the module dependency graph if needed**
5. **Include in pull request description**

---

## FAQ

**Q: Where does caching happen?**
A: Redis caching for challenges endpoint (5min TTL). Extend with cache.manager for other high-read endpoints.

**Q: How are failed blockchain transactions handled?**
A: Currently marked as failed. Future: implement retry with exponential backoff.

**Q: Can I run locally with Docker?**
A: Yes, use docker-compose for PostgreSQL and Redis. See README.md for setup.

**Q: What's the maximum user base this architecture supports?**
A: Single instance ~10k concurrent users. Add replication and caching for higher scale.

**Q: How are secrets managed?**
A: Environment variables (.env) - use .env.example as template. Never commit actual secrets.

