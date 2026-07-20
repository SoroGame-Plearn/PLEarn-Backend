# Data Flow Diagrams - PLEarn Backend

This document provides detailed sequence diagrams for key workflows in the PLEarn Backend system.

## 1. User Registration Flow

```
sequenceDiagram
    participant Client
    participant AuthController
    participant AuthService
    participant UserRepository
    participant PostgreSQL
    participant JWTService

    Client->>AuthController: POST /auth/register<br/>{email, password, username}
    AuthController->>AuthService: register(email, password, username)
    AuthService->>AuthService: validateEmail(email)
    AuthService->>AuthService: hashPassword(password)
    AuthService->>UserRepository: create({email, password_hash, username})
    UserRepository->>PostgreSQL: INSERT INTO users
    PostgreSQL-->>UserRepository: user_id
    UserRepository-->>AuthService: User entity
    AuthService->>JWTService: generateToken(user_id, email)
    JWTService-->>AuthService: JWT token
    AuthService-->>AuthController: {accessToken, user}
    AuthController-->>Client: 201 Created<br/>{accessToken, user}
    Note over Client: Store token in localStorage
```

## 2. User Login Flow

```
sequenceDiagram
    participant Client
    participant AuthController
    participant AuthService
    participant UserRepository
    participant PostgreSQL
    participant JWTService

    Client->>AuthController: POST /auth/login<br/>{email, password}
    AuthController->>AuthService: login(email, password)
    AuthService->>UserRepository: findByEmail(email)
    UserRepository->>PostgreSQL: SELECT FROM users WHERE email
    PostgreSQL-->>UserRepository: user record
    UserRepository-->>AuthService: User entity
    AuthService->>AuthService: comparePassword(provided, stored_hash)
    alt Password matches
        AuthService->>JWTService: generateToken(user_id, email)
        JWTService-->>AuthService: JWT token
        AuthService-->>AuthController: {accessToken, user}
        AuthController-->>Client: 200 OK<br/>{accessToken, user}
    else Password incorrect
        AuthService-->>AuthController: Unauthorized error
        AuthController-->>Client: 401 Unauthorized
    end
```

## 3. Challenge Completion & Reward Distribution Flow

```
sequenceDiagram
    participant Client
    participant ProgressController
    participant ProgressService
    participant RewardsService
    participant BlockchainService
    participant StellarHorizon
    participant PostgreSQL as DB
    participant Redis

    Client->>ProgressController: POST /progress<br/>{challengeId, score, metadata}
    ProgressController->>ProgressService: recordProgress(userId, challengeId, score)
    
    ProgressService->>DB: Verify challenge exists
    ProgressService->>DB: Check user can complete challenge
    
    ProgressService->>ProgressService: calculateScore(baseScore, difficulty)
    ProgressService->>DB: CREATE Progress record
    ProgressService->>DB: CREATE ActivityLog entry
    
    ProgressService->>RewardsService: evaluateReward(userId, score)
    
    RewardsService->>RewardsService: getTier(score)
    alt Score >= 100
        RewardsService->>RewardsService: xpmAmount = 10
    else Score >= 50
        RewardsService->>RewardsService: xpmAmount = 5
    else Score >= 10
        RewardsService->>RewardsService: xpmAmount = 1
    else
        RewardsService->>RewardsService: xpmAmount = 0
    end
    
    alt XLM amount > 0 AND user has Stellar key
        RewardsService->>DB: Get user's Stellar public key
        RewardsService->>DB: CREATE Reward record (status: pending)
        RewardsService->>BlockchainService: distributeReward(publicKey, xpm)
        
        BlockchainService->>BlockchainService: buildTransaction(publicKey, xpm)
        BlockchainService->>BlockchainService: signTransaction(distributorSecret)
        BlockchainService->>StellarHorizon: POST transaction
        StellarHorizon-->>BlockchainService: {tx_hash, status}
        
        BlockchainService->>DB: UPDATE Reward (status: distributed, tx_hash)
        BlockchainService-->>RewardsService: {success: true, tx_hash}
    else
        Note over RewardsService: No reward or no Stellar key
        RewardsService-->>ProgressService: {reward: null}
    end
    
    ProgressService-->>ProgressController: {progress, reward}
    ProgressController-->>Client: 201 Created<br/>{progress, reward}
    
    Note over Client: Update user profile with new score<br/>Show reward notification if applicable
```

## 4. Challenge List Retrieval with Caching

```
sequenceDiagram
    participant Client
    participant ChallengesController
    participant ChallengesService
    participant Redis
    participant PostgreSQL

    Client->>ChallengesController: GET /challenges
    ChallengesController->>ChallengesService: findAll()
    
    ChallengesService->>Redis: GET 'challenges'
    alt Cache HIT
        Redis-->>ChallengesService: challenges array
        ChallengesService-->>ChallengesController: challenges
        ChallengesController-->>Client: 200 OK<br/>{challenges}<br/>(from cache)
    else Cache MISS
        Redis-->>ChallengesService: null
        ChallengesService->>PostgreSQL: SELECT * FROM challenges WHERE active=true
        PostgreSQL-->>ChallengesService: challenges array
        ChallengesService->>Redis: SET 'challenges'<br/>(TTL: 5 minutes)
        Redis-->>ChallengesService: OK
        ChallengesService-->>ChallengesController: challenges
        ChallengesController-->>Client: 200 OK<br/>{challenges}
    end
```

## 5. Get User Profile with Authorization

```
sequenceDiagram
    participant Client
    participant UsersController
    participant JwtAuthGuard
    participant JWTService
    participant UsersService
    participant UserRepository
    participant PostgreSQL

    Client->>UsersController: GET /users/me<br/>Authorization: Bearer {token}
    
    UsersController->>JwtAuthGuard: validate request
    JwtAuthGuard->>JWTService: validateToken(token)
    JWTService->>JWTService: verify signature
    JWTService->>JWTService: check expiration
    
    alt Token valid
        JWTService-->>JwtAuthGuard: {user_id, email, ...}
        JwtAuthGuard-->>UsersController: Extract userId from token
        UsersController->>UsersService: getProfile(userId)
        UsersService->>UserRepository: findById(userId)
        UserRepository->>PostgreSQL: SELECT * FROM users WHERE id
        PostgreSQL-->>UserRepository: user record
        UserRepository-->>UsersService: User entity
        UsersService-->>UsersController: user profile
        UsersController-->>Client: 200 OK<br/>{user profile}
    else Token invalid or expired
        JWTService-->>JwtAuthGuard: Error
        JwtAuthGuard-->>UsersController: Unauthorized
        UsersController-->>Client: 401 Unauthorized
    end
```

## 6. Update User Stellar Wallet

```
sequenceDiagram
    participant Client
    participant UsersController
    participant JwtAuthGuard
    participant UsersService
    participant UserRepository
    participant PostgreSQL
    participant StellarValidator

    Client->>UsersController: PATCH /users/me<br/>{stellar_public_key}
    UsersController->>JwtAuthGuard: validate request
    JwtAuthGuard-->>UsersController: userId extracted
    
    UsersController->>UsersService: updateProfile(userId, {stellar_public_key})
    UsersService->>StellarValidator: validateStellarPublicKey(key)
    
    alt Key format valid
        StellarValidator-->>UsersService: {valid: true}
        UsersService->>UserRepository: update(userId, {stellar_public_key})
        UserRepository->>PostgreSQL: UPDATE users SET stellar_public_key
        PostgreSQL-->>UserRepository: 1 row updated
        UserRepository-->>UsersService: Updated user entity
        UsersService-->>UsersController: updated profile
        UsersController-->>Client: 200 OK<br/>{updated profile}
    else Key format invalid
        StellarValidator-->>UsersService: Validation error
        UsersService-->>UsersController: Bad request error
        UsersController-->>Client: 400 Bad Request<br/>{error: "Invalid Stellar key"}
    end
```

## 7. Get Activity Log with Pagination

```
sequenceDiagram
    participant Client
    participant ProgressController
    participant JwtAuthGuard
    participant ProgressService
    participant ActivityRepository
    participant PostgreSQL

    Client->>ProgressController: GET /progress/activity-log<br/>?page=1&limit=20
    ProgressController->>JwtAuthGuard: validate request
    JwtAuthGuard-->>ProgressController: userId extracted
    
    ProgressController->>ProgressService: getActivityLog(userId, page, limit)
    ProgressService->>ProgressService: Calculate offset<br/>offset = (page - 1) * limit
    
    ProgressService->>ActivityRepository: find({<br/>  user_id: userId,<br/>  skip: offset,<br/>  take: limit,<br/>  order: { created_at: DESC }<br/>})
    
    ActivityRepository->>PostgreSQL: SELECT * FROM activity_logs<br/>WHERE user_id = $1<br/>ORDER BY created_at DESC<br/>LIMIT $2 OFFSET $3
    
    PostgreSQL-->>ActivityRepository: activity records
    ActivityRepository-->>ProgressService: ActivityLog entities
    
    ProgressService->>ActivityRepository: count({user_id: userId})
    ActivityRepository->>PostgreSQL: SELECT COUNT(*) FROM activity_logs<br/>WHERE user_id = $1
    PostgreSQL-->>ActivityRepository: count
    
    ActivityRepository-->>ProgressService: {items, total}
    ProgressService->>ProgressService: Format response with pagination meta
    ProgressService-->>ProgressController: {items, pagination}
    ProgressController-->>Client: 200 OK<br/>{items, pagination:<br/>{page, limit, total, pages}}
```

## 8. Error Handling Flow (Invalid Request)

```
sequenceDiagram
    participant Client
    participant Controller
    participant Pipe as ValidationPipe
    participant GlobalExceptionFilter

    Client->>Controller: POST /progress<br/>{challengeId: "invalid", score: -10}
    
    Controller->>Pipe: Validate against ProgressDTO
    
    Pipe->>Pipe: Check @IsUUID() for challengeId
    Pipe->>Pipe: Check @Min(0) for score
    
    alt Validation fails
        Pipe->>GlobalExceptionFilter: Throw ValidationError
        GlobalExceptionFilter->>GlobalExceptionFilter: Format error response
        GlobalExceptionFilter-->>Client: 400 Bad Request<br/>{<br/>  statusCode: 400,<br/>  message: "Validation failed",<br/>  errors: [{<br/>    field: "challengeId",<br/>    message: "must be a UUID"<br/>  }, ...]<br/>}
    end
```

## Key Principles Illustrated

### 1. Request-Response Cycle
- Each request flows through Controller → Service → Repository → Database
- Response flows back through same path with transformation at each layer

### 2. JWT Authentication
- Token provided in `Authorization: Bearer <token>` header
- Validated by `JwtAuthGuard` before reaching controller
- User ID extracted and passed to service layer

### 3. Business Logic Separation
- Controllers handle HTTP concerns (routing, validation)
- Services handle business logic (calculations, orchestration)
- Repositories handle data access patterns

### 4. Caching Strategy
- High-read endpoints (Challenges) use Redis cache
- Cache invalidated on data changes
- Cache hits reduce database load significantly

### 5. Error Handling
- Validation errors caught at pipe level
- Consistent error response format
- Appropriate HTTP status codes used

### 6. Stellar Integration
- Triggered only when reward conditions met
- Asynchronous blockchain communication
- Transaction hash stored for audit trail

## Performance Considerations

### Database Optimization
- Indexed queries for user lookups (email, id)
- Pagination prevents loading all activity at once
- Activity logs should be indexed by (user_id, created_at)

### Caching Strategy
- Challenge list cached 5 minutes (low-write data)
- User profiles NOT cached (high-write, personalized)
- Redis connection pooled for efficiency

### Blockchain Optimization
- Consider async reward distribution (queue-based) for high volume
- Implement retry mechanism for failed transactions
- Monitor Stellar network latency

## Future Enhancements

1. **Event Sourcing** - Store all state changes as events
2. **CQRS** - Separate read and write models
3. **Message Queues** - Decouple reward distribution from progress recording
4. **GraphQL** - Consider alternative query language
5. **WebSockets** - Real-time updates for activity feeds

