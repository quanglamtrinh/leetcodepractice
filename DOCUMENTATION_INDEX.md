# 📚 Documentation Index

Danh sách đầy đủ tất cả tài liệu trong project.

---

## 🚀 Getting Started

| File | Description | For Who |
|------|-------------|---------|
| [README.md](README.md) | Main documentation | Everyone |
| [GET_STARTED.md](GET_STARTED.md) | Setup guide | New users |

---

## 🐳 Docker & Setup

| File | Description |
|------|-------------|
| [docs/DOCKER_SETUP_WINDOWS.md](docs/DOCKER_SETUP_WINDOWS.md) | Docker setup & commands guide |
| [docker-compose.yml](docker-compose.yml) | Docker orchestration config |
| [Dockerfile](Dockerfile) | Production Dockerfile |
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
| [docs/BACKUP_RESTORE_GUIDE.md](docs/BACKUP_RESTORE_GUIDE.md) | Complete backup/restore guide |
| [scripts/backup.ps1](scripts/backup.ps1) | Backup script |
| [scripts/restore.ps1](scripts/restore.ps1) | Restore script |

---

## ☁️ Cloud & Deployment

| File | Description |
|------|-------------|
| [docs/AWS_EC2_DEPLOYMENT.md](docs/AWS_EC2_DEPLOYMENT.md) | Complete EC2 deployment guide (Ubuntu) |
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
1. Start with: [README.md](README.md)
2. Then read: [GET_STARTED.md](GET_STARTED.md)
3. Setup Docker: [docs/DOCKER_SETUP_WINDOWS.md](docs/DOCKER_SETUP_WINDOWS.md)

### I Need to Backup/Restore
1. Full guide: [docs/BACKUP_RESTORE_GUIDE.md](docs/BACKUP_RESTORE_GUIDE.md)
2. Scripts: [scripts/backup.ps1](scripts/backup.ps1) and [scripts/restore.ps1](scripts/restore.ps1)

### I Want to Know About Database
1. Initialization: [docs/DATABASE_INITIALIZATION_PROCESS.md](docs/DATABASE_INITIALIZATION_PROCESS.md)
2. Persistence: [docs/HOW_SOLVED_PROBLEMS_ARE_SAVED.md](docs/HOW_SOLVED_PROBLEMS_ARE_SAVED.md)
3. Schema: [comprehensive-schema.sql](comprehensive-schema.sql)

### I'm Deploying to AWS
1. EC2 deployment: [docs/AWS_EC2_DEPLOYMENT.md](docs/AWS_EC2_DEPLOYMENT.md)
2. AWS S3: [docs/AWS_S3_INTEGRATION.md](docs/AWS_S3_INTEGRATION.md)
3. Backup setup: [docs/BACKUP_RESTORE_GUIDE.md](docs/BACKUP_RESTORE_GUIDE.md)

### I'm Developing Features
1. Specs: [.kiro/specs/](/.kiro/specs/) folder
2. API docs: Check controllers in [server/controllers/](server/controllers/)

---

## 📁 Directory Structure

```
leetcodepractice/
├── 📄 README.md                      ← Start here!
├── 📄 GET_STARTED.md                 ← Setup guide
├── 📄 DOCUMENTATION_INDEX.md         ← This file
├── 📄 SECURITY.md                    ← Security guidelines
│
├── 📁 docs/                          ← Technical docs
│   ├── DATABASE_INITIALIZATION_PROCESS.md
│   ├── HOW_SOLVED_PROBLEMS_ARE_SAVED.md
│   ├── BACKUP_RESTORE_GUIDE.md
│   ├── AWS_EC2_DEPLOYMENT.md
│   ├── AWS_S3_INTEGRATION.md
│   ├── DOCKER_SETUP_WINDOWS.md
│   └── DATABASE_PERSISTENCE.md
│
├── 📁 scripts/                       ← Automation scripts
│   ├── backup.ps1
│   ├── restore.ps1
│   ├── deploy-ec2.sh
│   └── deploy-ec2-amazon-linux.sh
│
├── 📁 .kiro/specs/                   ← Feature specs
│   ├── novel-notes-replacement/
│   ├── calendar-feature/
│   ├── calendar-day-notes-persistence-fix/
│   └── cicd-preparation/
│
├── 📁 client/                        ← Frontend (React)
├── 📁 server/                        ← Backend (Node.js)
├── 📁 backups/                       ← Database backups
└── 📁 archive/                       ← Old files
```

---

## 🔍 Search Tips

### Find by Keyword

**Docker:**
- docs/DOCKER_SETUP_WINDOWS.md
- docker-compose.yml

**Database:**
- docs/DATABASE_INITIALIZATION_PROCESS.md
- docs/HOW_SOLVED_PROBLEMS_ARE_SAVED.md
- comprehensive-schema.sql

**Backup:**
- docs/BACKUP_RESTORE_GUIDE.md
- scripts/backup.ps1

**Setup:**
- GET_STARTED.md
- README.md

**AWS/Cloud:**
- docs/AWS_EC2_DEPLOYMENT.md
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

## 🧹 Recently Cleaned (Nov 17, 2025)

Removed duplicate/redundant files:
- ❌ QUICK_OVERVIEW.md (merged into README.md)
- ❌ PROJECT_SUMMARY.md (info in docs/)
- ❌ EC2_QUICK_START.md (use docs/AWS_EC2_DEPLOYMENT.md)
- ❌ BACKUP_QUICK_GUIDE.md (use docs/BACKUP_RESTORE_GUIDE.md)
- ❌ DOCKER_COMMANDS.md (use docs/DOCKER_SETUP_WINDOWS.md)
- ❌ RESTRUCTURE_PLAN.md (restructure complete)
- ❌ archive/leetcode_backend/ (old unused backend)

---

**Last Updated:** November 17, 2025  
**Total Documents:** 15+ essential files
