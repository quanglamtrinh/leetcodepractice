# LeetCode Practice App with PostgreSQL

A full-stack LeetCode practice application with PostgreSQL database for persistent data storage.

## Features

- **Problem Management**: Browse problems by concept (Arrays & Hashing, Two Pointers, etc.)
- **Progress Tracking**: Mark problems as solved/unsolved with persistent storage
- **Notes System**: Add personal notes for each problem
- **Sorting**: Sort by difficulty, popularity, acceptance rate, solved/unsolved status
- **Statistics**: Track overall progress and difficulty breakdown
- **Database Backend**: PostgreSQL for reliable data persistence

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express
- **Database**: PostgreSQL
- **API**: RESTful endpoints

## Setup Instructions

### 1. Install PostgreSQL

1. Download PostgreSQL from [https://www.postgresql.org/download/windows/](https://www.postgresql.org/download/windows/)
2. Run the installer and set a password for the `postgres` user
3. Keep default port (5432)
4. Install all components (PostgreSQL Server, pgAdmin, Stack Builder)

### 2. Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE leetcode_practice;

# Connect to the new database
\c leetcode_practice

# Exit psql
\q
```

### 3. Install Node.js Dependencies

```bash
npm install
```

### 4. Configure Environment

1. Copy `env.example` to `.env`
2. Update the database password in `.env`:
```
DB_PASSWORD=your_actual_password_here
```

### 5. Setup Database Schema

```bash
npm run setup-db
```

This will:
- Create all necessary tables
- Import problems from your CSV file
- Set up indexes and triggers

### 6. Start the Server

```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

The server will run on `http://localhost:3001`

## Database Schema

### Tables

1. **problems**: Stores all LeetCode problems
   - `id`: Primary key
   - `title`: Problem title
   - `concept`: Problem category
   - `difficulty`: Easy/Medium/Hard
   - `acceptance_rate`: Problem acceptance rate
   - `popularity`: Problem popularity score
   - `leetcode_link`: Link to LeetCode problem

2. **user_progress**: Stores user progress for each problem
   - `id`: Primary key
   - `problem_id`: Foreign key to problems
   - `solved`: Boolean indicating if problem is solved
   - `solved_at`: Timestamp when problem was solved
   - `notes`: User's personal notes
   - `created_at`, `updated_at`: Timestamps

## API Endpoints

### Quick Testing with curl

```bash
# Get all problems
curl http://localhost:3001/api/problems | jq .

# Get problems by concept (URL-encoded)
curl "http://localhost:3001/api/problems/concept/Arrays%20%26%20Hashing" | jq .

# Mark problem as solved
curl -X PUT http://localhost:3001/api/problems/1/progress \
  -H "Content-Type: application/json" \
  -d '{"solved": true}'

# Add notes to a problem
curl -X PUT http://localhost:3001/api/problems/1/progress \
  -H "Content-Type: application/json" \
  -d '{"notes": "Used sliding window technique"}'

# Get progress statistics
curl http://localhost:3001/api/stats | jq .

# Health check
curl http://localhost:3001/api/health | jq .
```

### Endpoint Details

| Method | Endpoint | Description | Request Body |
|--------|----------|-------------|--------------|
| GET | `/api/problems` | Get all problems with progress | - |
| GET | `/api/problems/concept/:concept` | Get problems by concept | - |
| PUT | `/api/problems/:id/progress` | Update problem progress | `{solved: boolean, notes: string}` |
| GET | `/api/stats` | Get progress statistics | - |
| POST | `/api/import-problems` | Import problems from CSV | - |
| GET | `/api/health` | Health check endpoint | - |

See [API Documentation](docs/API.md) for complete details.

## Frontend Integration

The frontend (`index.html`, `script.js`, `styles.css`) will need to be updated to use the API endpoints instead of localStorage. This provides:

- **Persistent data**: Progress survives browser restarts
- **Better performance**: Database queries are faster than localStorage
- **Scalability**: Can support multiple users in the future
- **Data integrity**: ACID compliance ensures data consistency

## Development

### File Structure
```
├── index.html              # Frontend
├── script.js               # Frontend JavaScript
├── styles.css              # Frontend CSS
├── server.js               # Express server
├── schema.sql              # Database schema
├── setup-database.js       # Database setup script
├── package.json            # Node.js dependencies
├── env.example             # Environment variables template
└── leetcode_master_with_popularity.csv  # Problem data
```

### Adding New Features

1. **Database**: Add new tables/columns in `schema.sql`
2. **Backend**: Add new API endpoints in `server.js`
3. **Frontend**: Update UI and JavaScript to use new endpoints

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Check password in `.env` file
- Verify database name is correct

### Import Issues
- Ensure CSV file exists and has correct format
- Check CSV column names match expected format

### Port Issues
- Change `PORT` in `.env` if 3001 is in use
- Update frontend API calls if port changes

## Deployment

### Docker (Recommended)

```bash
# Quick start with Docker Compose
docker-compose up -d

# Or build and run manually
docker build -t leetcode-practice .
docker run -p 3001:3001 --env-file .env leetcode-practice
```

### AWS Deployment

Deploy to AWS using App Runner, ECS, or EC2. See [Deployment Guide](docs/DEPLOYMENT.md) for:

- AWS App Runner setup (easiest, auto-HTTPS)
- Amazon ECR image hosting
- RDS PostgreSQL configuration
- Environment variable management
- CI/CD with GitHub Actions

### Production Checklist

- [ ] Set strong `DB_PASSWORD` in environment
- [ ] Configure database backups
- [ ] Set up monitoring and alerts
- [ ] Enable HTTPS/SSL
- [ ] Review security settings in `SECURITY.md`

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on:

- Commit message conventions (Conventional Commits)
- Branch naming (feat/, fix/, chore/, docs/)
- Pull request process
- Code style and linting

## Development Workflow

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run linters
npm run lint

# Format code
npm run format

# Database operations
npm run db:migrate   # Run migrations
npm run db:seed      # Seed with CSV data
```

## Project Structure

```
├── client/              # React frontend
├── server.js            # Express backend
├── migrations/          # Database migrations
├── scripts/             # Utility scripts
├── data/                # CSV data files
├── docs/                # Documentation
├── .github/workflows/   # CI/CD pipelines
└── comprehensive-schema.sql  # Database schema
```

## Screenshots

<!-- TODO: Add screenshots of the application -->

_Screenshots will be added soon showing:_
- Problem list view
- Problem detail with notes
- Progress statistics dashboard

## Roadmap

### Current Features ✅

- Problem browsing by concept
- Progress tracking (solved/unsolved)
- Personal notes system
- Statistics dashboard
- PostgreSQL persistence

### Planned Features 🚀

1. **User Authentication**: Multi-user support with login
2. **Spaced Repetition**: Smart review scheduling
3. **Advanced Analytics**: Progress charts and trends
4. **Problem Recommendations**: AI-powered suggestions
5. **Study Plans**: Custom learning paths
6. **Discussion Forum**: Share solutions and tips

## License

MIT License - see [LICENSE](LICENSE) for details

## Support

- **Issues**: [GitHub Issues](https://github.com/penguingm1/leetcodepractice/issues)
- **Documentation**: See `/docs` directory
- **API Reference**: [docs/API.md](docs/API.md)