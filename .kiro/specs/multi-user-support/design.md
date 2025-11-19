# Multi-User Support Design Document

## Overview

This design document outlines the architecture for adding multi-user support to the LeetCode Practice App. The system will transition from a single-user application to a multi-tenant system where each user has isolated data while sharing the common problem database. The design includes JWT-based authentication, user management, data isolation, and calendar features for personalized scheduling.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Auth Pages   │  │ Problem List │  │   Calendar   │      │
│  │ Login/Signup │  │   & Stats    │  │  Dashboard   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│           │                │                  │              │
│           └────────────────┴──────────────────┘              │
│                            │                                 │
│                    JWT Token in Header                       │
└────────────────────────────┼────────────────────────────────┘
                             │ HTTPS/REST
┌────────────────────────────┼────────────────────────────────┐
│                    Express Server                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Authentication Middleware                   │   │
│  │  - Verify JWT Token                                  │   │
│  │  - Extract User ID                                   │   │
│  │  - Attach to req.user                                │   │
│  └──────────────────────────────────────────────────────┘   │
│                            │                                 │
│  ┌─────────────┬───────────┴──────────┬──────────────┐     │
│  │ Auth Routes │  Protected Routes     │ Public Routes│     │
│  │ /auth/*     │  /api/problems/*      │ /api/health  │     │
│  │             │  /api/calendar/*      │              │     │
│  │             │  /api/reviews/*       │              │     │
│  └─────────────┴───────────┬──────────┴──────────────┘     │
└────────────────────────────┼────────────────────────────────┘
                             │ SQL Queries
┌────────────────────────────┼────────────────────────────────┐
│                    PostgreSQL Database                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │    users     │  │  problems    │  │user_progress │      │
│  │  (new)       │  │  (shared)    │  │  (modified)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │calendar_notes│  │calendar_tasks│  │calendar_events│     │
│  │  (new)       │  │  (new)       │  │  (new)       │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐                                           │
│  │review_history│                                           │
│  │  (modified)  │                                           │
│  └──────────────┘                                           │
└──────────────────────────────────────────────────────────────┘
```

### Authentication Flow

```
Registration Flow:
User → POST /auth/register → Validate Input → Hash Password → 
Create User → Return Success

Login Flow:
User → POST /auth/login → Validate Credentials → Compare Password → 
Generate JWT → Return Token + User Info

Protected Request Flow:
User → Request + JWT → Auth Middleware → Verify Token → 
Extract User ID → Attach to req.user → Route Handler → 
Filter by User ID → Return User-Specific Data
```

## Components and Interfaces

### 1. Database Schema Changes

#### New Tables

**users table**
```sql
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
```

**calendar_notes table**
```sql
CREATE TABLE calendar_notes (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    note_date DATE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_calendar_notes_user_date ON calendar_notes(user_id, note_date);
```

**calendar_tasks table**
```sql
CREATE TABLE calendar_tasks (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_date DATE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_calendar_tasks_user_date ON calendar_tasks(user_id, task_date);
CREATE INDEX idx_calendar_tasks_completed ON calendar_tasks(user_id, completed);
```

**calendar_events table**
```sql
CREATE TABLE calendar_events (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_date DATE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (end_time > start_time)
);

CREATE INDEX idx_calendar_events_user_date ON calendar_events(user_id, event_date);
```

#### Modified Tables

**user_progress table** (formerly tied to problems, now user-specific)
```sql
-- Add user_id column
ALTER TABLE user_progress ADD COLUMN user_id BIGINT REFERENCES users(id) ON DELETE CASCADE;

-- Create composite unique constraint
ALTER TABLE user_progress ADD CONSTRAINT unique_user_problem 
    UNIQUE (user_id, problem_id);

-- Add index for efficient queries
CREATE INDEX idx_user_progress_user_id ON user_progress(user_id);
```

**review_history table**
```sql
-- Add user_id column
ALTER TABLE review_history ADD COLUMN user_id BIGINT REFERENCES users(id) ON DELETE CASCADE;

-- Add index
CREATE INDEX idx_review_history_user_id ON review_history(user_id);
CREATE INDEX idx_review_history_user_next_review ON review_history(user_id, next_review_date);
```

**review_attempts table**
```sql
-- Add user_id column
ALTER TABLE review_attempts ADD COLUMN user_id BIGINT REFERENCES users(id) ON DELETE CASCADE;

-- Add index
CREATE INDEX idx_review_attempts_user_id ON review_attempts(user_id);
```

**problems table** (remains shared, remove user-specific columns)
```sql
-- Remove solved and notes columns as they move to user_progress
ALTER TABLE problems DROP COLUMN IF EXISTS solved;
ALTER TABLE problems DROP COLUMN IF EXISTS notes;
```

### 2. Authentication Service

**Location**: `server/services/authService.js`

**Responsibilities**:
- User registration with password hashing
- User login with credential verification
- JWT token generation and verification
- Password validation

**Key Methods**:
```javascript
class AuthService {
  async registerUser(email, username, password)
  async loginUser(email, password)
  async verifyToken(token)
  generateToken(userId, email)
  hashPassword(password)
  comparePassword(password, hash)
}
```

**Dependencies**:
- `bcrypt` for password hashing (salt rounds: 10)
- `jsonwebtoken` for JWT operations
- `validator` for email validation

**JWT Payload Structure**:
```javascript
{
  userId: 123,
  email: "user@example.com",
  iat: 1234567890,  // issued at
  exp: 1234567890   // expires (7 days from iat)
}
```

### 3. Authentication Middleware

**Location**: `server/middleware/auth.js`

**Purpose**: Protect routes and extract user identity

**Implementation**:
```javascript
const authenticateToken = (req, res, next) => {
  // Extract token from Authorization header
  // Verify token using JWT
  // Attach user info to req.user
  // Call next() or return 401
}

const optionalAuth = (req, res, next) => {
  // Similar to authenticateToken but doesn't fail if no token
  // Used for routes that work with or without auth
}
```

### 4. Auth Routes

**Location**: `server/routes/authRoutes.js`

**Endpoints**:

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Register new user | No |
| POST | `/auth/login` | Login user | No |
| POST | `/auth/logout` | Logout user (client-side) | No |
| GET | `/auth/me` | Get current user info | Yes |
| PUT | `/auth/password` | Change password | Yes |

**Request/Response Examples**:

```javascript
// POST /auth/register
Request: {
  email: "user@example.com",
  username: "johndoe",
  password: "securepass123"
}
Response: {
  message: "User registered successfully",
  userId: 123
}

// POST /auth/login
Request: {
  email: "user@example.com",
  password: "securepass123"
}
Response: {
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  user: {
    id: 123,
    email: "user@example.com",
    username: "johndoe"
  }
}

// GET /auth/me
Response: {
  id: 123,
  email: "user@example.com",
  username: "johndoe",
  created_at: "2025-01-01T00:00:00Z"
}
```

### 5. Modified Problem Routes

**Location**: `server/routes/problemRoutes.js`

**Changes**:
- Add `authenticateToken` middleware to all routes
- Filter queries by `req.user.userId`
- Update progress operations to include `user_id`

**Key Modifications**:
```javascript
// GET /api/problems - now returns user-specific progress
router.get('/', authenticateToken, async (req, res) => {
  // JOIN problems with user_progress WHERE user_id = req.user.userId
});

// PUT /api/problems/:id/progress - now user-specific
router.put('/:id/progress', authenticateToken, async (req, res) => {
  // UPSERT user_progress WHERE user_id = req.user.userId AND problem_id = :id
});
```

### 6. Calendar Routes

**Location**: `server/routes/calendarRoutes.js`

**Endpoints**:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/calendar/:date` | Get all calendar items for date |
| GET | `/calendar/range` | Get calendar items for date range |
| POST | `/calendar/notes` | Create calendar note |
| PUT | `/calendar/notes/:id` | Update calendar note |
| DELETE | `/calendar/notes/:id` | Delete calendar note |
| POST | `/calendar/tasks` | Create calendar task |
| PUT | `/calendar/tasks/:id` | Update calendar task |
| PUT | `/calendar/tasks/:id/complete` | Mark task complete |
| DELETE | `/calendar/tasks/:id` | Delete calendar task |
| POST | `/calendar/events` | Create calendar event |
| PUT | `/calendar/events/:id` | Update calendar event |
| DELETE | `/calendar/events/:id` | Delete calendar event |

**Example Response for GET /calendar/:date**:
```javascript
{
  date: "2025-11-18",
  notes: [
    {
      id: 1,
      content: "Focused on dynamic programming today",
      created_at: "2025-11-18T10:00:00Z"
    }
  ],
  tasks: [
    {
      id: 1,
      title: "Solve 3 medium problems",
      description: "Focus on sliding window",
      completed: false,
      created_at: "2025-11-18T09:00:00Z"
    }
  ],
  events: [
    {
      id: 1,
      title: "Study session",
      description: "Practice arrays",
      start_time: "14:00:00",
      end_time: "16:00:00",
      created_at: "2025-11-18T08:00:00Z"
    }
  ]
}
```

### 7. Review Routes Enhancement

**Location**: `server/routes/reviewRoutes.js`

**New Endpoint**:
```javascript
// GET /api/reviews/due-today
router.get('/due-today', authenticateToken, async (req, res) => {
  // Query review_history for user's problems due today
  // Return problems with days_overdue calculation
});
```

**Response Example**:
```javascript
{
  dueProblems: [
    {
      id: 1,
      problem_id: 42,
      title: "Two Sum",
      difficulty: "easy",
      next_review_date: "2025-11-15",
      days_overdue: 3
    },
    {
      id: 2,
      problem_id: 15,
      title: "3Sum",
      difficulty: "medium",
      next_review_date: "2025-11-18",
      days_overdue: 0
    }
  ],
  total_due: 2
}
```

### 8. Frontend Authentication State Management

**Location**: `client/src/context/AuthContext.jsx`

**State Structure**:
```javascript
{
  user: {
    id: 123,
    email: "user@example.com",
    username: "johndoe"
  },
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  isAuthenticated: true,
  loading: false
}
```

**Key Functions**:
```javascript
const AuthContext = {
  login(email, password),
  register(email, username, password),
  logout(),
  checkAuth(),  // Verify token on app load
  refreshToken()  // Optional: refresh expiring tokens
}
```

**Token Storage**: localStorage with key `leetcode_auth_token`

### 9. Frontend Protected Routes

**Location**: `client/src/components/ProtectedRoute.jsx`

**Implementation**:
```javascript
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" />;
  
  return children;
}
```

### 10. API Client with Auth

**Location**: `client/src/services/api.js`

**Implementation**:
```javascript
const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add token
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('leetcode_auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle 401
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('leetcode_auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

## Data Models

### User Model
```javascript
{
  id: number,
  email: string,
  username: string,
  password_hash: string,  // Never exposed in API
  created_at: timestamp,
  updated_at: timestamp,
  last_login: timestamp
}
```

### Calendar Note Model
```javascript
{
  id: number,
  user_id: number,
  note_date: date,
  content: string,
  created_at: timestamp,
  updated_at: timestamp
}
```

### Calendar Task Model
```javascript
{
  id: number,
  user_id: number,
  task_date: date,
  title: string,
  description: string,
  completed: boolean,
  completed_at: timestamp,
  created_at: timestamp,
  updated_at: timestamp
}
```

### Calendar Event Model
```javascript
{
  id: number,
  user_id: number,
  event_date: date,
  title: string,
  description: string,
  start_time: time,
  end_time: time,
  created_at: timestamp,
  updated_at: timestamp
}
```

### User Progress Model (Modified)
```javascript
{
  id: number,
  user_id: number,  // NEW
  problem_id: number,
  solved: boolean,
  solved_at: timestamp,
  notes: string,
  created_at: timestamp,
  updated_at: timestamp
}
```

## Error Handling

### Authentication Errors

| Error | Status Code | Response |
|-------|-------------|----------|
| Invalid credentials | 401 | `{ error: "Invalid email or password" }` |
| Email already exists | 409 | `{ error: "Email already registered" }` |
| Invalid token | 401 | `{ error: "Invalid or expired token" }` |
| Missing token | 401 | `{ error: "Authentication required" }` |
| Weak password | 400 | `{ error: "Password must be at least 8 characters" }` |
| Invalid email format | 400 | `{ error: "Invalid email format" }` |

### Authorization Errors

| Error | Status Code | Response |
|-------|-------------|----------|
| Access denied | 403 | `{ error: "Access denied" }` |
| Resource not found | 404 | `{ error: "Resource not found" }` |

## Testing Strategy

### Unit Tests

**Auth Service Tests**:
- Password hashing and comparison
- JWT token generation and verification
- User registration validation
- Login credential verification

**Middleware Tests**:
- Token extraction from headers
- Token verification
- User attachment to request
- Error handling for invalid tokens

### Integration Tests

**Auth Flow Tests**:
- Complete registration flow
- Complete login flow
- Protected route access with valid token
- Protected route rejection with invalid token

**Data Isolation Tests**:
- User A cannot access User B's progress
- User A cannot modify User B's calendar items
- User A cannot see User B's review history

**Calendar Tests**:
- Create, read, update, delete notes
- Create, read, update, delete tasks
- Create, read, update, delete events
- Date range queries

### End-to-End Tests

- User registration → login → problem solving → logout
- User login → calendar management → due problems view
- Multiple users with isolated data

## Security Considerations

### Password Security
- Bcrypt hashing with salt rounds = 10
- Minimum password length: 8 characters
- No password in API responses or logs
- Password change requires current password

### JWT Security
- Secret key stored in environment variable
- Token expiration: 7 days
- HTTPS only in production
- HttpOnly cookies (optional enhancement)

### Data Isolation
- All user-specific queries filtered by user_id
- Foreign key constraints with CASCADE delete
- Row-level security (future enhancement)

### Input Validation
- Email format validation
- SQL injection prevention (parameterized queries)
- XSS prevention (input sanitization)
- Request size limits

### Rate Limiting (Future Enhancement)
- Login attempts: 5 per 15 minutes
- Registration: 3 per hour per IP
- API requests: 100 per minute per user

## Migration Strategy

### Phase 1: Database Migration
1. Create `users` table
2. Create calendar tables
3. Add `user_id` columns to existing tables
4. Create indexes
5. Update database functions for user filtering

### Phase 2: Backend Implementation
1. Implement auth service
2. Implement auth middleware
3. Create auth routes
4. Update existing routes with auth
5. Implement calendar routes
6. Update review routes for due-today

### Phase 3: Frontend Implementation
1. Create auth context and provider
2. Build login/register pages
3. Implement protected routes
4. Update API client with auth headers
5. Build calendar UI components
6. Update problem list with due-today section

### Phase 4: Data Migration (if existing data)
1. Create default user for existing data
2. Associate all existing progress with default user
3. Notify users to create accounts

### Phase 5: Testing & Deployment
1. Run all tests
2. Deploy to staging
3. User acceptance testing
4. Deploy to production
5. Monitor for issues

## Performance Considerations

### Database Optimization
- Composite indexes on (user_id, date) for calendar tables
- Composite index on (user_id, problem_id) for user_progress
- Connection pooling (already implemented)
- Query optimization with EXPLAIN ANALYZE

### Caching Strategy (Future)
- Cache user profile data
- Cache problem list (shared across users)
- Redis for session management

### API Response Times
- Target: < 200ms for authenticated requests
- Target: < 100ms for problem list
- Target: < 150ms for calendar queries

## Monitoring & Logging

### Metrics to Track
- Authentication success/failure rate
- Average response time per endpoint
- Active users count
- Database connection pool usage
- Error rates by endpoint

### Logging Strategy
- Log all authentication attempts
- Log authorization failures
- Log database errors
- Do NOT log passwords or tokens
- Use structured logging (JSON format)

## Future Enhancements

### Phase 2 Features
- Email verification
- Password reset via email
- OAuth integration (Google, GitHub)
- Two-factor authentication
- User profile customization

### Phase 3 Features
- Social features (share progress)
- Study groups
- Leaderboards
- Problem recommendations based on user history

---

This design provides a solid foundation for multi-user support while maintaining data isolation, security, and performance.
