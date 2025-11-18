# 📁 Project Restructure Plan

## 🎯 Mục Tiêu

Tổ chức lại project thành cấu trúc rõ ràng, dễ maintain và deploy.

---

## 📊 Cấu Trúc Hiện Tại (Lộn Xộn)

```
leetcodepractice/
├── client/                    # Frontend (OK)
├── server/                    # Backend (OK)
├── docs/                      # Documentation (OK)
├── scripts/                   # Scripts (OK)
├── backups/                   # Backups (OK)
├── 1-D Dynamic Programming/   # ❌ LeetCode problem folders (lộn xộn)
├── 2-D Dynamic Programming/   # ❌
├── Arrays & Hashing/          # ❌
├── ... (20+ folders)          # ❌
├── *.csv                      # ❌ CSV files ở root
├── *.py                       # ❌ Python scripts ở root
├── *.js                       # ❌ JS files ở root
├── *.html, *.css              # ❌ Old frontend files
└── ... (nhiều files lộn xộn)
```

---

## ✅ Cấu Trúc Mới (Gọn Gàng)

```
leetcodepractice/
│
├── 📁 backend/                    # Backend application
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── config/
│   │   ├── utils/
│   │   └── server.js
│   ├── scripts/
│   │   ├── importProblems.js
│   │   ├── backupDatabase.js
│   │   └── restoreDatabase.js
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example
│
├── 📁 frontend/                   # Frontend application
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   ├── types/
│   │   ├── utils/
│   │   └── App.tsx
│   ├── public/
│   ├── package.json
│   └── tsconfig.json
│
├── 📁 database/                   # Database related
│   ├── schema/
│   │   └── comprehensive-schema.sql
│   ├── migrations/
│   └── seeds/
│
├── 📁 data/                       # Data files
│   ├── csv/
│   │   ├── leetcode_comprehensive.csv
│   │   ├── leetcode_master.csv
│   │   └── ...
│   └── reference/
│
├── 📁 scripts/                    # Utility scripts
│   ├── deployment/
│   │   ├── deploy-ec2.sh
│   │   └── deploy-ec2-amazon-linux.sh
│   ├── backup/
│   │   ├── backup.ps1
│   │   └── restore.ps1
│   └── data-processing/
│       ├── *.py (Python scripts)
│       └── *.js (Node scripts)
│
├── 📁 docs/                       # Documentation
│   ├── deployment/
│   │   ├── AWS_EC2_DEPLOYMENT.md
│   │   ├── AWS_EC2_AMAZON_LINUX.md
│   │   └── DOCKER_SETUP_WINDOWS.md
│   ├── database/
│   │   ├── DATABASE_INITIALIZATION_PROCESS.md
│   │   └── HOW_SOLVED_PROBLEMS_ARE_SAVED.md
│   ├── guides/
│   │   ├── BACKUP_RESTORE_GUIDE.md
│   │   └── AWS_S3_INTEGRATION.md
│   └── api/
│       └── API_REFERENCE.md
│
├── 📁 docker/                     # Docker configuration
│   ├── docker-compose.yml
│   ├── docker-compose.prod.yml
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   └── nginx/
│       └── nginx.conf
│
├── 📁 archive/                    # Old/unused files
│   ├── leetcode-problems/
│   │   ├── 1-D Dynamic Programming/
│   │   ├── Arrays & Hashing/
│   │   └── ...
│   └── old-frontend/
│       ├── index.html
│       ├── script.js
│       └── styles.css
│
├── 📁 .github/                    # GitHub specific
│   └── workflows/
│       └── ci-cd.yml
│
├── 📁 .kiro/                      # Kiro IDE config
│
├── 📄 README.md                   # Main documentation
├── 📄 PROJECT_SUMMARY.md
├── 📄 QUICK_OVERVIEW.md
├── 📄 EC2_QUICK_START.md
├── 📄 .gitignore
├── 📄 .env.example
└── 📄 package.json                # Root package.json (workspace)
```

---

## 🔄 Migration Steps

### Phase 1: Backup Everything (QUAN TRỌNG!)

```bash
# 1. Commit current state
git add .
git commit -m "Before restructure"

# 2. Create backup
.\scripts\backup.ps1

# 3. Create branch
git checkout -b restructure
```

### Phase 2: Create New Structure

```bash
# Create new folders
mkdir -p backend/src/{controllers,routes,middleware,config,utils}
mkdir -p backend/scripts
mkdir -p frontend/src
mkdir -p database/{schema,migrations,seeds}
mkdir -p data/{csv,reference}
mkdir -p scripts/{deployment,backup,data-processing}
mkdir -p docs/{deployment,database,guides,api}
mkdir -p docker/nginx
mkdir -p archive/{leetcode-problems,old-frontend}
```

### Phase 3: Move Backend Files

```bash
# Move server files
mv server/* backend/src/
mv server.js backend/src/
mv package.json backend/
mv node_modules backend/

# Move backend scripts
mv server/scripts/* backend/scripts/
```

### Phase 4: Move Frontend Files

```bash
# Move client files
mv client/* frontend/
```

### Phase 5: Move Database Files

```bash
# Move schema
mv comprehensive-schema.sql database/schema/
mv reference_data.sql database/schema/

# Move migrations
mv migrations/* database/migrations/
```

### Phase 6: Move Data Files

```bash
# Move CSV files
mv *.csv data/csv/

# Move Python scripts
mv *.py scripts/data-processing/
```

### Phase 7: Move Docker Files

```bash
# Move Docker files
mv docker-compose.yml docker/
mv Dockerfile docker/Dockerfile.backend
mv Dockerfile.dev docker/Dockerfile.backend.dev
```

### Phase 8: Move Documentation

```bash
# Move deployment docs
mv docs/AWS_EC2_*.md docs/deployment/
mv docs/DOCKER_*.md docs/deployment/

# Move database docs
mv docs/DATABASE_*.md docs/database/
mv docs/HOW_SOLVED_*.md docs/database/

# Move guides
mv docs/BACKUP_*.md docs/guides/
mv docs/AWS_S3_*.md docs/guides/
```

### Phase 9: Move Scripts

```bash
# Move deployment scripts
mv scripts/deploy-*.sh scripts/deployment/

# Move backup scripts
mv scripts/backup.ps1 scripts/backup/
mv scripts/restore.ps1 scripts/backup/
```

### Phase 10: Archive Old Files

```bash
# Move LeetCode problem folders
mv "1-D Dynamic Programming" archive/leetcode-problems/
mv "2-D Dynamic Programming" archive/leetcode-problems/
mv "Arrays & Hashing" archive/leetcode-problems/
# ... (all problem folders)

# Move old frontend files
mv index.html archive/old-frontend/
mv script.js archive/old-frontend/
mv styles.css archive/old-frontend/
mv main.*.css archive/old-frontend/
```

### Phase 11: Update Configuration Files

Update paths in:
- `docker/docker-compose.yml`
- `backend/package.json`
- `frontend/package.json`
- `.gitignore`
- Documentation files

### Phase 12: Test Everything

```bash
# Test backend
cd backend
npm install
npm run dev

# Test frontend
cd ../frontend
npm install
npm start

# Test Docker
cd ..
docker-compose -f docker/docker-compose.yml up
```

---

## 📝 Files to Update

### 1. docker-compose.yml

```yaml
# Update paths
services:
  postgres:
    volumes:
      - ./database/schema/comprehensive-schema.sql:/docker-entrypoint-initdb.d/01-schema.sql
  
  app:
    build:
      context: ./backend
      dockerfile: Dockerfile
```

### 2. .gitignore

```gitignore
# Add
/backend/node_modules/
/frontend/node_modules/
/backend/.env
/data/csv/*.csv
/archive/

# Keep
/backups/
/logs/
```

### 3. Root package.json (Workspace)

```json
{
  "name": "leetcode-practice-monorepo",
  "private": true,
  "workspaces": [
    "backend",
    "frontend"
  ],
  "scripts": {
    "dev:backend": "npm run dev --workspace=backend",
    "dev:frontend": "npm run start --workspace=frontend",
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "docker:up": "docker-compose -f docker/docker-compose.yml up",
    "docker:down": "docker-compose -f docker/docker-compose.yml down"
  }
}
```

---

## ⚠️ Important Notes

### DO NOT Delete:

- ✅ `backups/` - Keep all backups
- ✅ `logs/` - Keep logs
- ✅ `.git/` - Keep git history
- ✅ `.env` - Keep environment variables
- ✅ `node_modules/` - Will be recreated

### CAN Archive:

- ✅ LeetCode problem folders (move to `archive/`)
- ✅ Old frontend files (move to `archive/`)
- ✅ Python scripts (move to `scripts/data-processing/`)
- ✅ Old CSV files (move to `data/csv/`)

### MUST Update:

- ✅ All import paths in code
- ✅ Docker configuration
- ✅ Documentation links
- ✅ Scripts paths
- ✅ CI/CD configuration

---

## 🎯 Benefits

### Before (Current):
- ❌ 50+ items in root folder
- ❌ Mixed frontend/backend/data files
- ❌ Hard to find files
- ❌ Confusing for new developers
- ❌ Difficult to deploy separately

### After (Restructured):
- ✅ ~10 clear folders in root
- ✅ Separated concerns (frontend/backend/data)
- ✅ Easy to navigate
- ✅ Clear structure for new developers
- ✅ Can deploy frontend/backend separately
- ✅ Professional project structure

---

## 🚀 Next Steps

1. **Review this plan** - Make sure you agree
2. **Backup everything** - Run backup script
3. **Create branch** - `git checkout -b restructure`
4. **Execute migration** - Follow steps above
5. **Test thoroughly** - Make sure everything works
6. **Update documentation** - Fix all links
7. **Merge to main** - After testing

---

## 📞 Need Help?

If you want me to:
- ✅ Create automated migration script
- ✅ Update all configuration files
- ✅ Fix all import paths
- ✅ Update documentation

Just let me know!

---

**Ready to restructure? This will make your project much more professional! 🎉**
