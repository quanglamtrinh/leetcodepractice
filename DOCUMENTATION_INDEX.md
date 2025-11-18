# 📚 Documentation Index

Danh sách đầy đủ tất cả tài liệu trong project.

---

## 🚀 Getting Started

| File | Description | For Who |
|------|-------------|---------|
| [QUICK_OVERVIEW.md](QUICK_OVERVIEW.md) | Tóm tắt siêu ngắn (1 trang) | Everyone |
| [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) | Tóm tắt chi tiết dự án | Developers |
| [README.md](README.md) | Main documentation | Everyone |
| [GET_STARTED.md](GET_STARTED.md) | Setup guide | New users |

---

## 🐳 Docker & Setup

| File | Description |
|------|-------------|
| [DOCKER_COMMANDS.md](DOCKER_COMMANDS.md) | Docker command reference |
| [docs/DOCKER_SETUP_WINDOWS.md](docs/DOCKER_SETUP_WINDOWS.md) | Windows Docker setup guide |
| [docker-compose.yml](docker-compose.yml) | Docker orchestration config |
| [Dockerfile.dev](Dockerfile.dev) | Development Dockerfile |

---

## 💾 Database

| File | Description |
|------|-------------|
| [docs/DATABASE_INITIALIZATION_PROCESS.md](docs/DATABASE_INITIALIZATION_PROCESS.md) | How database is created from CSV |
| [docs/HOW_SOLVED_PROBLEMS_ARE_SAVED.md](docs/HOW_SOLVED_PROBLEMS_ARE_SAVED.md) | Data persistence explained |
| [docs/DATABASE_PERSISTENCE.md](docs/DATABASE_PERSISTENCE.md) | Database persistence guide |
| [comprehensive-schema.sql](comprehensive-schema.sql) | Database schema |

---

## 🔄 Backup & Restore

| File | Description |
|------|-------------|
| [BACKUP_QUICK_GUIDE.md](BACKUP_QUICK_GUIDE.md) | Quick backup reference |
| [docs/BACKUP_RESTORE_GUIDE.md](docs/BACKUP_RESTORE_GUIDE.md) | Complete backup/restore guide |
| [scripts/backup.ps1](scripts/backup.ps1) | Backup script |
| [scripts/restore.ps1](scripts/restore.ps1) | Restore script |
| [scripts/backup-auto.ps1](scripts/backup-auto.ps1) | Auto backup script |
| [scripts/README.md](scripts/README.md) | Scripts documentation |

---

## ☁️ Cloud & Deployment

| File | Description |
|------|-------------|
| [EC2_QUICK_START.md](EC2_QUICK_START.md) | Quick EC2 deployment (15 min) |
| [docs/AWS_EC2_DEPLOYMENT.md](docs/AWS_EC2_DEPLOYMENT.md) | EC2 deployment (Ubuntu) |
| [docs/AWS_EC2_AMAZON_LINUX.md](docs/AWS_EC2_AMAZON_LINUX.md) | EC2 deployment (Amazon Linux) |
| [docs/UBUNTU_VS_AMAZON_LINUX.md](docs/UBUNTU_VS_AMAZON_LINUX.md) | Ubuntu vs Amazon Linux comparison |
| [docs/AWS_S3_INTEGRATION.md](docs/AWS_S3_INTEGRATION.md) | AWS S3 integration guide |
| [scripts/deploy-ec2.sh](scripts/deploy-ec2.sh) | Automated setup (Ubuntu) |
| [scripts/deploy-ec2-amazon-linux.sh](scripts/deploy-ec2-amazon-linux.sh) | Automated setup (Amazon Linux) |

---

## 🎯 Features & Specs

| File | Description |
|------|-------------|
| [.kiro/specs/novel-notes-replacement/](/.kiro/specs/novel-notes-replacement/) | Novel notes feature spec |
| [.kiro/specs/calendar-feature/](/.kiro/specs/calendar-feature/) | Calendar feature spec |
| [.kiro/specs/calendar-day-notes-persistence-fix/](/.kiro/specs/calendar-day-notes-persistence-fix/) | Calendar persistence fix |
| [.kiro/specs/cicd-preparation/](/.kiro/specs/cicd-preparation/) | CI/CD preparation spec |

---

## 📂 Component Documentation

| File | Description |
|------|-------------|
| [client/README.md](client/README.md) | React app documentation |
| [data/README.md](data/README.md) | Data files documentation |

---

## 🔧 Configuration Files

| File | Description |
|------|-------------|
| [.env](.env) | Environment variables |
| [package.json](package.json) | Node.js dependencies |
| [.gitignore](.gitignore) | Git ignore rules |
| [.dockerignore](.dockerignore) | Docker ignore rules |

---

## 📊 Quick Reference by Topic

### I'm New Here
1. Start with: [QUICK_OVERVIEW.md](QUICK_OVERVIEW.md)
2. Then read: [GET_STARTED.md](GET_STARTED.md)
3. Setup Docker: [docs/DOCKER_SETUP_WINDOWS.md](docs/DOCKER_SETUP_WINDOWS.md)

### I Want to Understand the Project
1. Read: [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)
2. Check: [README.md](README.md)
3. Explore: [docs/](docs/) folder

### I Need to Backup/Restore
1. Quick guide: [BACKUP_QUICK_GUIDE.md](BACKUP_QUICK_GUIDE.md)
2. Full guide: [docs/BACKUP_RESTORE_GUIDE.md](docs/BACKUP_RESTORE_GUIDE.md)
3. Scripts: [scripts/](scripts/) folder

### I Want to Know About Database
1. Initialization: [docs/DATABASE_INITIALIZATION_PROCESS.md](docs/DATABASE_INITIALIZATION_PROCESS.md)
2. Persistence: [docs/HOW_SOLVED_PROBLEMS_ARE_SAVED.md](docs/HOW_SOLVED_PROBLEMS_ARE_SAVED.md)
3. Schema: [comprehensive-schema.sql](comprehensive-schema.sql)

### I'm Deploying to Production
1. Docker setup: [DOCKER_COMMANDS.md](DOCKER_COMMANDS.md)
2. AWS S3: [docs/AWS_S3_INTEGRATION.md](docs/AWS_S3_INTEGRATION.md)
3. Backup setup: [docs/BACKUP_RESTORE_GUIDE.md](docs/BACKUP_RESTORE_GUIDE.md)

### I'm Developing Features
1. Project structure: [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)
2. Specs: [.kiro/specs/](/.kiro/specs/) folder
3. API docs: Check controllers in [server/controllers/](server/controllers/)

---

## 📁 Directory Structure

```
leetcodepractice/
├── 📄 QUICK_OVERVIEW.md              ← Start here!
├── 📄 PROJECT_SUMMARY.md             ← Full overview
├── 📄 README.md                      ← Main docs
├── 📄 GET_STARTED.md                 ← Setup guide
├── 📄 BACKUP_QUICK_GUIDE.md          ← Backup reference
├── 📄 DOCKER_COMMANDS.md             ← Docker commands
├── 📄 DOCUMENTATION_INDEX.md         ← This file
│
├── 📁 docs/                          ← Technical docs
│   ├── DATABASE_INITIALIZATION_PROCESS.md
│   ├── HOW_SOLVED_PROBLEMS_ARE_SAVED.md
│   ├── BACKUP_RESTORE_GUIDE.md
│   ├── AWS_S3_INTEGRATION.md
│   ├── DOCKER_SETUP_WINDOWS.md
│   └── DATABASE_PERSISTENCE.md
│
├── 📁 scripts/                       ← Automation scripts
│   ├── README.md
│   ├── backup.ps1
│   ├── restore.ps1
│   └── backup-auto.ps1
│
├── 📁 .kiro/specs/                   ← Feature specs
│   ├── novel-notes-replacement/
│   ├── calendar-feature/
│   ├── calendar-day-notes-persistence-fix/
│   └── cicd-preparation/
│
├── 📁 client/                        ← Frontend
│   └── README.md
│
├── 📁 server/                        ← Backend
│   ├── controllers/
│   ├── routes/
│   ├── middleware/
│   └── scripts/
│
└── 📁 backups/                       ← Database backups
    └── *.sql files
```

---

## 🔍 Search Tips

### Find by Keyword

**Docker:**
- DOCKER_COMMANDS.md
- docs/DOCKER_SETUP_WINDOWS.md
- docker-compose.yml

**Database:**
- docs/DATABASE_INITIALIZATION_PROCESS.md
- docs/HOW_SOLVED_PROBLEMS_ARE_SAVED.md
- comprehensive-schema.sql

**Backup:**
- BACKUP_QUICK_GUIDE.md
- docs/BACKUP_RESTORE_GUIDE.md
- scripts/backup.ps1

**Setup:**
- GET_STARTED.md
- README.md
- docs/DOCKER_SETUP_WINDOWS.md

**AWS/Cloud:**
- docs/AWS_S3_INTEGRATION.md

---

## 📝 Documentation Standards

All documentation follows these principles:

1. ✅ **Clear headings** - Easy to scan
2. ✅ **Code examples** - Copy-paste ready
3. ✅ **Step-by-step** - Easy to follow
4. ✅ **Visual aids** - Diagrams and tables
5. ✅ **Cross-references** - Links to related docs

---

## 🆕 Recently Added

- ✅ QUICK_OVERVIEW.md (Nov 16, 2025)
- ✅ PROJECT_SUMMARY.md (Nov 16, 2025)
- ✅ DOCUMENTATION_INDEX.md (Nov 16, 2025)
- ✅ docs/HOW_SOLVED_PROBLEMS_ARE_SAVED.md (Nov 16, 2025)
- ✅ docs/DATABASE_INITIALIZATION_PROCESS.md (Nov 16, 2025)
- ✅ docs/BACKUP_RESTORE_GUIDE.md (Nov 16, 2025)
- ✅ docs/AWS_S3_INTEGRATION.md (Nov 16, 2025)
- ✅ BACKUP_QUICK_GUIDE.md (Nov 16, 2025)
- ✅ scripts/backup.ps1 (Nov 16, 2025)
- ✅ scripts/restore.ps1 (Nov 16, 2025)

---

## 💡 Contributing to Documentation

When adding new documentation:

1. Add entry to this index
2. Follow existing format
3. Include code examples
4. Cross-reference related docs
5. Update "Recently Added" section

---

**Last Updated:** November 16, 2025  
**Total Documents:** 20+ files
