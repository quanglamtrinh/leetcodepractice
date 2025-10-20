# Architecture Overview

This document describes the architecture and design decisions of the LeetCode Practice App.

## System Architecture

```
┌─────────────────┐
│   Web Browser   │
│  (React/HTML)   │
└────────┬────────┘
         │ HTTP/REST
         ▼
┌─────────────────┐
│  Express Server │
│   (Node.js)     │
│   Port: 3001    │
└────────┬────────┘
         │ SQL
         ▼
┌─────────────────┐
│   PostgreSQL    │
│    Database     │
│   Port: 5432    │
└─────────────────┘
```

## Technology Stack

### Frontend
- **HTML5/CSS3**: Structure and styling
- **JavaScript (ES6+)**: Client-side logic
- **React** (in `/client`): Modern component-based UI
- **Fetch API**: HTTP requests to backend

### Backend
- **Node.js**: Runtime environment
- **Express.js**: Web framework
- **pg**: PostgreSQL client library
- **dotenv**: Environment variable management
- **cors**: Cross-origin resource sharing
- **csv-parser**: CSV data import

### Database
- **PostgreSQL 15+**: Relational database
- **Tables**: `problems`, `user_progress`, `review_history`
- **Indexes**: Optimized for common queries

### DevOps
- **Docker**: Containerization
- **Docker Compose**: Multi-container orchestration
- **GitHub Actions**: CI/CD automation
- **AWS**: Cloud deployment (ECR, App Runner, RDS)

## Data Flow

### Problem Loading

```
CSV File → Parser → Express Endpoint → PostgreSQL INSERT
                                     ↓
                            Validation & Deduplication
```

### User Progress Update

```
User Action → Frontend → PUT /api/problems/:id/progress
                              ↓
                         Express Handler
                              ↓
                    Database Transaction (UPSERT)
                              ↓
                        Success Response
```

### Problem Browsing

```
User Request → GET /api/problems?concept=X
                     ↓
               Express Handler
                     ↓
         SQL Query with JOIN (problems + user_progress)
                     ↓
         Result Set → JSON Response
```

## Database Schema

### Entity Relationship Diagram

```
┌─────────────────────┐
│      problems       │
├─────────────────────┤
│ id (PK)             │
│ title               │
│ concept             │
│ difficulty          │
│ acceptance_rate     │
│ popularity          │
│ leetcode_link       │
│ created_at          │
│ updated_at          │
└──────────┬──────────┘
           │
           │ 1:N
           │
           ▼
┌─────────────────────┐
│   user_progress     │
├─────────────────────┤
│ id (PK)             │
│ problem_id (FK)     │
│ solved              │
│ solved_at           │
│ notes               │
│ created_at          │
│ updated_at          │
└─────────────────────┘
```

### Indexes

For query performance:

- `idx_problems_concept` - Fast filtering by concept
- `idx_problems_difficulty` - Fast filtering by difficulty
- `idx_problems_popularity` - Efficient sorting by popularity
- `idx_user_progress_problem_id` - Quick progress lookups
- `idx_user_progress_solved` - Filter solved/unsolved

## Design Patterns

### Repository Pattern
Database access is centralized in the Express route handlers with prepared statements to prevent SQL injection.

### RESTful API
- **GET**: Read operations
- **PUT**: Update operations
- **POST**: Create operations
- Resources are nouns (`/problems`, `/stats`)

### Environment-Based Configuration
All environment-specific settings use environment variables:
- Database credentials
- Server port
- Node environment (dev/prod)

## Security Considerations

### Implemented
- Environment variables for secrets
- Parameterized SQL queries (prevent injection)
- CORS configuration
- Input validation
- `.gitignore` for sensitive files

### Planned
- User authentication (JWT)
- API rate limiting
- Request size limits
- HTTPS/TLS in production
- Database connection encryption

## Performance Optimizations

### Current
- Database connection pooling (max 20 connections)
- Indexes on frequently queried columns
- Efficient SQL queries with JOINs
- Static file serving from Express

### Future
- Redis caching for frequently accessed data
- Query result pagination
- Database query optimization
- CDN for static assets
- Gzip compression

## Scalability

### Current Limitations
- Single server instance
- No load balancing
- No caching layer
- No session management

### Scaling Strategy

**Horizontal Scaling**:
1. Deploy multiple container instances
2. Add load balancer (AWS ALB)
3. Shared PostgreSQL database (RDS)
4. Session store (Redis)

**Vertical Scaling**:
1. Increase container resources
2. Upgrade database instance
3. Optimize queries

## Error Handling

### Client Errors (4xx)
- Validation errors return `400 Bad Request`
- Missing resources return `404 Not Found`

### Server Errors (5xx)
- Database errors caught and logged
- Generic error message returned to client
- Full error logged server-side

### Error Middleware
```javascript
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});
```

## Logging

### Current
- Console.log for development
- Request logging (timestamps)
- Error logging with stack traces

### Production
- Structured logging (JSON format)
- Log levels (info, warn, error)
- CloudWatch Logs integration
- Error tracking (Sentry/Rollbar)

## Testing Strategy

### Planned Tests
- **Unit Tests**: Business logic functions
- **Integration Tests**: API endpoints
- **E2E Tests**: Full user workflows
- **Load Tests**: Performance benchmarks

### Test Commands
```bash
npm test           # Run all tests
npm run test:unit  # Unit tests only
npm run test:e2e   # End-to-end tests
```

## Development Environment

### Local Setup
1. PostgreSQL running locally
2. Node.js environment
3. Environment variables in `.env`

### Docker Setup
1. Docker Compose for all services
2. Isolated network for containers
3. Volume persistence for database

## Deployment Architecture

### AWS App Runner
```
GitHub → GitHub Actions → ECR → App Runner → RDS PostgreSQL
```

### Traditional
```
Developer → Git Push → CI Build → Docker Image → Cloud Platform
                                                    ↓
                                              Load Balancer
                                                    ↓
                                         App Containers (N instances)
                                                    ↓
                                           RDS PostgreSQL
```

## Monitoring & Observability

### Health Checks
- Application: `/api/health`
- Database: Connection pool status
- Docker: Container health check

### Metrics to Monitor
- Request rate
- Response time
- Error rate
- Database connection pool usage
- Memory usage
- CPU usage

## Data Migration

### CSV Import Strategy
1. Parse CSV file
2. Validate data format
3. UPSERT to database (insert or update)
4. Log results

### Schema Migrations
1. Version-controlled SQL files in `/migrations`
2. Sequential numbering (001, 002, ...)
3. Migration runner script
4. Rollback capability (manual)

## Future Enhancements

### Planned Architecture Changes

1. **Microservices** (if needed):
   - Auth service
   - Problem service
   - Analytics service

2. **Caching Layer**:
   - Redis for session storage
   - Cache frequently accessed problems
   - Invalidation strategy

3. **Message Queue**:
   - Async job processing
   - Email notifications
   - Data export/import

4. **Real-time Features**:
   - WebSocket for live updates
   - Collaborative features
   - Progress notifications

---

For API details, see [API.md](API.md).

For deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

