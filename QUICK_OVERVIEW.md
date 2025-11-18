# ⚡ Quick Overview - LeetCode Practice App

## 🎯 What Is This?

Ứng dụng quản lý và theo dõi tiến độ luyện tập LeetCode với 1,414 bài tập.

## 📊 Current Status

```
✅ 1,414 problems imported
✅ 60 problems solved
✅ Docker running (17 hours uptime)
✅ 2 backups created (1.98 MB each)
✅ All features working
```

## 🏗️ Tech Stack

```
React + TypeScript  →  Node.js + Express  →  PostgreSQL 15  →  Docker
```

## 🚀 Quick Start

```powershell
# Start
docker-compose up -d

# Backup
.\scripts\backup.ps1

# Access
http://localhost:3001
```

## 📁 Key Files

| File | Purpose |
|------|---------|
| `PROJECT_SUMMARY.md` | Detailed project overview |
| `README.md` | Main documentation |
| `GET_STARTED.md` | Setup guide |
| `BACKUP_QUICK_GUIDE.md` | Backup reference |
| `docs/` | Technical documentation |

## 🎯 Main Features

1. **Problem Management** - Browse 1,414 LeetCode problems
2. **Progress Tracking** - Track solved problems (60 solved)
3. **Notes System** - Personal notes for each problem
4. **Calendar** - Plan study schedule
5. **Spaced Repetition** - Smart review system
6. **AI Integration** - Ask AI for help

## 💾 Data

- **Database:** PostgreSQL in Docker
- **Storage:** Docker volume `postgres_data`
- **Backups:** `backups/` folder
- **Persistence:** Survives restarts (unless you use `-v` flag)

## ⚠️ Important

```powershell
# ✅ SAFE - Keeps data
docker-compose down

# ❌ DANGEROUS - Deletes data
docker-compose down -v
```

## 📚 Documentation

- **Full Summary:** `PROJECT_SUMMARY.md`
- **Setup Guide:** `GET_STARTED.md`
- **Backup Guide:** `docs/BACKUP_RESTORE_GUIDE.md`
- **Database Info:** `docs/DATABASE_INITIALIZATION_PROCESS.md`
- **Data Persistence:** `docs/HOW_SOLVED_PROBLEMS_ARE_SAVED.md`

## 🔧 Common Commands

```powershell
# Start/Stop
docker-compose up -d
docker-compose down

# Backup/Restore
.\scripts\backup.ps1
.\scripts\restore.ps1

# Logs
docker-compose logs -f

# Database
docker exec -it leetcode-postgres psql -U leetcodeuser -d leetcodepractice
```

## 📞 Need Help?

1. Check `PROJECT_SUMMARY.md` for details
2. See `docs/` folder for specific topics
3. Run `docker-compose logs` for errors

---

**Status:** ✅ Production Ready  
**Last Updated:** November 16, 2025
