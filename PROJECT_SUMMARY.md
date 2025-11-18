# 📊 LeetCode Practice App - Tóm Tắt Dự Án

## 🎯 Mục Đích

Ứng dụng quản lý và theo dõi tiến độ luyện tập LeetCode với:
- ✅ 1,414 bài tập từ LeetCode
- ✅ Theo dõi tiến độ (60 bài đã solved)
- ✅ Hệ thống ghi chú cá nhân
- ✅ Calendar để lên kế hoạch học tập
- ✅ Spaced repetition system
- ✅ AI integration (Ask AI feature)

---

## 🏗️ Kiến Trúc

### Tech Stack

```
┌─────────────────────────────────────────────────────────┐
│ Frontend: React + TypeScript                            │
│ ├─ Components: Calendar, Problem List, Notes Editor    │
│ ├─ Services: API calls, Calendar service               │
│ └─ Styling: CSS modules                                │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Backend: Node.js + Express                              │
│ ├─ Controllers: MVC pattern                            │
│ ├─ Routes: RESTful API                                 │
│ ├─ Middleware: Error handling, logging                 │
│ └─ Scripts: Import, backup, restore                    │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Database: PostgreSQL 15                                 │
│ ├─ 13 tables (problems, review_history, calendar, etc.)│
│ ├─ Stored procedures & functions                       │
│ └─ Views for analytics                                 │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Infrastructure: Docker + Docker Compose                 │
│ ├─ Container 1: PostgreSQL (port 5432)                 │
│ ├─ Container 2: Node.js App (port 3001)                │
│ └─ Volume: postgres_data (persistent storage)          │
└─────────────────────────────────────────────────────────┘
```

### Cấu Trúc Thư Mục

```
leetcodepractice/
├── client/                      # React Frontend
│   ├── src/
│   │   ├── components/         # React components
│   │   │   ├── calendar/       # Calendar feature
│   │   │   ├── AskAI.tsx       # AI integration
│   │   │   └── ...
│   │   ├── services/           # API services
│   │   ├── types/              # TypeScript types
│   │   └── styles/             # CSS files
│   └── public/
│
├── server/                      # Backend
│   ├── controllers/            # MVC controllers
│   │   ├── problemController.js
│   │   ├── calendarController.js
│   │   └── ...
│   ├── routes/                 # API routes
│   ├── middleware/             # Express middleware
│   ├── config/                 # Database config
│   └── scripts/                # Utility scripts
│       ├── importProblems.js
│       ├── backupDatabase.js
│       └── restoreDatabase.js
│
├── scripts/                     # PowerShell scripts
│   ├── backup.ps1              # Backup database
│   ├── restore.ps1             # Restore database
│   └── backup-auto.ps1         # Auto backup
│
├── backups/                     # Database backups
│   ├── backup_20251116_190332.sql
│   └── ...
│
├── docs/                        # Documentation
│   ├── DATABASE_INITIALIZATION_PROCESS.md
│   ├── HOW_SOLVED_PROBLEMS_ARE_SAVED.md
│   ├── BACKUP_RESTORE_GUIDE.md
│   ├── AWS_S3_INTEGRATION.md
│   └── ...
│
├── docker-compose.yml           # Docker orchestration
├── Dockerfile.dev               # Development Dockerfile
├── comprehensive-schema.sql     # Database schema
├── leetcode_comprehensive.csv   # Problem data
├── package.json                 # Dependencies
└── .env                         # Environment variables
```

---

## 🚀 Tính Năng Chính

### 1. Problem Management
- **1,414 bài tập** từ LeetCode
- Phân loại theo concept (Arrays, Two Pointers, DP, etc.)
- Lọc theo độ khó (Easy, Medium, Hard)
- Sắp xếp theo popularity, acceptance rate
- Search problems

### 2. Progress Tracking
- Đánh dấu solved/unsolved
- **60 bài đã solved** (dữ liệu thực của bạn)
- Thống kê tiến độ
- Review history

### 3. Notes System
- Ghi chú cá nhân cho mỗi bài
- Rich text editor (Novel.js integration)
- Lưu solution approaches
- Backward compatibility converter

### 4. Calendar Feature
- Lên kế hoạch học tập
- Track solved problems by date
- Events, tasks, notes
- Day/Week/Month views
- Tooltips và detail views

### 5. Spaced Repetition
- Review scheduler
- Forgetting recovery engine
- Intensive recovery manager
- Custom review patterns

### 6. AI Integration
- Ask AI feature
- AI service integration
- Problem recommendations

---

## 💾 Database

### Schema Overview

**13 Tables:**
1. `problems` - 1,414 LeetCode problems
2. `concepts` - Problem categories
3. `techniques` - Solving techniques
4. `goals` - Learning goals
5. `patterns` - Problem patterns
6. `variants` - Pattern variants
7. `template_basics` - Code templates
8. `template_variants` - Template variations
9. `review_history` - Spaced repetition data
10. `review_attempts` - Review tracking
11. `review_patterns` - Review schedules
12. `mistakes` - Error tracking
13. `problem_tags` - Many-to-many relationships

**Key Features:**
- ENUM types (difficulty, review_result, mistake_type)
- Stored procedures (add_review_session, process_review_session)
- Functions (get_due_problems_today)
- Views (due_problems_today, problem_stats, mistake_analysis)
- Triggers (auto-update timestamps)
- Indexes (performance optimization)

### Data Persistence

**Docker Volume:** `postgres_data`
- Location: `/var/lib/docker/volumes/leetcodepractice_postgres_data/_data`
- Size: ~2 MB (compressed backup)
- Persistent: Survives container restarts
- **IMPORTANT:** Only deleted with `docker-compose down -v`

---

## 🔧 Setup & Development

### Quick Start

```powershell
# 1. Start Docker containers
docker-compose up -d

# 2. Wait for healthy status
docker ps

# 3. Access app
# Frontend: http://localhost:3001
# API: http://localhost:3001/api/problems
```

### Development Workflow

```powershell
# Start development
docker-compose up -d

# View logs
docker-compose logs -f app

# Restart after code changes
docker-compose restart app

# Stop (keep data)
docker-compose down

# Stop and remove data (DANGEROUS!)
docker-compose down -v
```

### Database Operations

```powershell
# Backup database
.\scripts\backup.ps1

# Restore database
.\scripts\restore.ps1

# Connect to database
docker exec -it leetcode-postgres psql -U leetcodeuser -d leetcodepractice

# Import problems from CSV
docker exec -it leetcode-app node server/scripts/importProblems.js
```

---

## 📊 Current Status

### Database Stats
- **Total Problems:** 1,414
- **Solved Problems:** 60
- **Review History:** Active
- **Calendar Events:** Tracked

### Containers
- ✅ `leetcode-postgres` - Up 17 hours (healthy)
- ✅ `leetcode-app` - Up 4 hours

### Backups
- ✅ 2 backup files (1.98 MB each)
- ✅ Backup scripts ready
- ✅ Auto-backup setup available

---

## 📚 Documentation

### Core Documentation
- **README.md** - Main project overview
- **GET_STARTED.md** - Quick start guide
- **PROJECT_SUMMARY.md** - This file

### Technical Docs
- **DATABASE_INITIALIZATION_PROCESS.md** - How database is created
- **HOW_SOLVED_PROBLEMS_ARE_SAVED.md** - Data persistence explained
- **BACKUP_RESTORE_GUIDE.md** - Backup/restore procedures
- **AWS_S3_INTEGRATION.md** - S3 integration guide
- **DOCKER_COMMANDS.md** - Docker command reference

### Quick Guides
- **BACKUP_QUICK_GUIDE.md** - Quick backup reference
- **DOCKER_QUICKSTART.md** - Docker quick start
- **DOCKER_SETUP_WINDOWS.md** - Windows Docker setup

---

## 🎯 Roadmap

### Completed ✅
- [x] Problem management system
- [x] Progress tracking
- [x] Notes system
- [x] Calendar feature
- [x] Spaced repetition
- [x] Docker setup
- [x] Database backup/restore
- [x] MVC refactoring
- [x] Error handling & logging
- [x] AI integration

### In Progress 🚧
- [ ] Novel notes replacement
- [ ] Calendar day notes persistence fix
- [ ] CI/CD preparation

### Planned 🚀
- [ ] User authentication
- [ ] Multi-user support
- [ ] Advanced analytics
- [ ] Mobile app
- [ ] AWS deployment
- [ ] S3 backup integration

---

## 🛠️ Technologies Used

### Frontend
- React 18
- TypeScript
- CSS Modules
- Novel.js (Rich text editor)

### Backend
- Node.js 18
- Express.js
- PostgreSQL 15
- pg (node-postgres)

### DevOps
- Docker
- Docker Compose
- PowerShell scripts

### Tools
- Git
- VS Code
- pgAdmin (optional)
- Docker Desktop

---

## 📞 Quick Commands

### Daily Use
```powershell
# Start app
docker-compose up -d

# Backup now
.\scripts\backup.ps1

# View problems
curl http://localhost:3001/api/problems

# Check health
curl http://localhost:3001/api/health
```

### Maintenance
```powershell
# View logs
docker-compose logs -f

# Restart
docker-compose restart

# Clean rebuild
docker-compose down
docker-compose up -d --build

# Database shell
docker exec -it leetcode-postgres psql -U leetcodeuser -d leetcodepractice
```

### Backup/Restore
```powershell
# Backup
.\scripts\backup.ps1

# Restore
.\scripts\restore.ps1

# List backups
Get-ChildItem backups -Filter "*.sql"
```

---

## 🔒 Security Notes

- ✅ Environment variables in `.env` (not committed)
- ✅ Database password protected
- ✅ Docker network isolation
- ✅ Backup files excluded from git
- ⚠️ Change default passwords in production
- ⚠️ Enable HTTPS for production
- ⚠️ Set up firewall rules

---

## 💡 Tips & Best Practices

### Data Safety
1. ✅ **Always backup before major changes**
   ```powershell
   .\scripts\backup.ps1
   ```

2. ✅ **Never use `docker-compose down -v`** (deletes data)
   ```powershell
   docker-compose down  # Safe - keeps data
   ```

3. ✅ **Setup auto-backup** (Task Scheduler)
   - See: `docs/BACKUP_RESTORE_GUIDE.md`

### Development
1. ✅ **Use hot reload** - Code changes auto-restart
2. ✅ **Check logs** - `docker-compose logs -f app`
3. ✅ **Test API** - Use curl or Postman
4. ✅ **Commit often** - Small, focused commits

### Performance
1. ✅ **Database indexes** - Already optimized
2. ✅ **Connection pooling** - Configured in `database.js`
3. ✅ **Caching** - Calendar service has cache
4. ✅ **Lazy loading** - Components load on demand

---

## 📈 Project Stats

- **Lines of Code:** ~15,000+
- **Components:** 30+ React components
- **API Endpoints:** 20+ routes
- **Database Tables:** 13 tables
- **Documentation:** 10+ markdown files
- **Scripts:** 5+ automation scripts
- **Development Time:** Multiple sessions
- **Current Status:** Production-ready

---

## 🎓 Learning Resources

### Used in This Project
- [React Documentation](https://react.dev/)
- [Express.js Guide](https://expressjs.com/)
- [PostgreSQL Tutorial](https://www.postgresql.org/docs/)
- [Docker Documentation](https://docs.docker.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### Recommended Reading
- [LeetCode Patterns](https://seanprashad.com/leetcode-patterns/)
- [Spaced Repetition](https://en.wikipedia.org/wiki/Spaced_repetition)
- [MVC Architecture](https://en.wikipedia.org/wiki/Model%E2%80%93view%E2%80%93controller)

---

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

## 📄 License

MIT License - See LICENSE file for details

---

**Last Updated:** November 16, 2025  
**Version:** 1.0.0  
**Status:** ✅ Production Ready
