# 📁 LeetCode Practice - Project Structure

## 🏗️ Architecture Overview

```
leetcodepractice/
├── 🎨 client/                    # Frontend (React)
├── 🔧 server/                    # Backend (Node.js + Express)
├── 📚 docs/                      # Documentation
├── 🔨 scripts/                   # Utility scripts
├── 🐳 Docker files               # Containerization
└── 📋 Configuration files        # Project config
```

---

## 📂 Detailed Structure

### 🎨 Frontend (`client/`)

```
client/
├── public/                       # Static assets
│   ├── index.html
│   └── favicon.ico
│
├── src/
│   ├── components/              # React components
│   │   ├── calendar/           # Calendar feature components
│   │   │   ├── CalendarGrid.tsx
│   │   │   ├── CalendarCell.tsx
│   │   │   ├── CalendarDayView.tsx
│   │   │   ├── CalendarWeekView.tsx
│   │   │   ├── DayNotesEditor.tsx    # Rich text editor for day notes
│   │   │   ├── DayDetailView.tsx
│   │   │   ├── EventForm.tsx
│   │   │   ├── TaskForm.tsx
│   │   │   ├── NoteForm.tsx
│   │   │   └── ProblemsList.tsx
│   │   │
│   │   ├── ProblemList.tsx      # Main problem list
│   │   ├── ProblemDetail.tsx    # Problem detail view
│   │   ├── SolvedProblemsList.tsx
│   │   ├── SimilarProblemsTab.tsx
│   │   ├── NovelNotesTab.tsx    # Rich text editor (Novel.sh)
│   │   ├── CalendarTab.tsx      # Calendar integration
│   │   └── AskAI.tsx            # AI assistant component
│   │
│   ├── services/                # API services
│   │   ├── index.ts            # Main API client
│   │   ├── calendarService.ts  # Calendar API calls
│   │   └── aiService.ts        # AI integration
│   │
│   ├── utils/                   # Utility functions
│   │   ├── dateUtils.ts        # Date formatting/parsing
│   │   └── BackwardCompatibilityConverter.ts
│   │
│   ├── types/                   # TypeScript types
│   │   └── calendar.ts
│   │
│   ├── styles/                  # CSS files
│   │   ├── styles.css
│   │   ├── novel-editor.css
│   │   └── ask-ai.css
│   │
│   ├── integration/             # Third-party integrations
│   │   └── novelNotesTabIntegration.js
│   │
│   ├── App.tsx                  # Main app component
│   ├── index.tsx                # Entry point
│   └── novelMain.tsx            # Novel editor entry
│
├── package.json                 # Frontend dependencies
└── README.md
```

**Key Features:**
- ⚛️ React 18 with TypeScript
- 📝 Novel.sh rich text editor with:
  - Image upload & resize
  - YouTube embed
  - Tables, code blocks, markdown
  - AI assistance
- 📅 Calendar with events, tasks, notes
- 🎯 Problem tracking & filtering
- 🔍 Similar problems suggestions

---

### 🔧 Backend (`server/`)

```
server/
├── controllers/                 # Business logic
│   ├── problemController.js    # Problem CRUD operations
│   ├── calendarController.js   # Calendar operations
│   ├── reviewController.js     # Review system
│   ├── patternController.js    # Pattern management
│   └── conceptController.js    # Concept management
│
├── routes/                      # API endpoints
│   ├── index.js                # Route aggregator
│   ├── problemRoutes.js        # /api/problems/*
│   ├── calendarRoutes.js       # /api/calendar/*
│   └── conceptRoutes.js        # /api/concepts/*
│
├── middleware/                  # Express middleware
│   ├── errorHandler.js         # Global error handling
│   └── logger.js               # Request logging
│
├── config/                      # Configuration
│   └── database.js             # Database connection
│
├── scripts/                     # Utility scripts
│   ├── importProblems.js       # Import problems from JSON
│   ├── backupDatabase.js       # Backup to S3
│   ├── restoreDatabase.js      # Restore from S3
│   └── restoreFromLocal.js     # Restore from local backup
│
├── Dockerfile                   # Production Docker image
├── .dockerignore               # Docker ignore rules
├── docker-compose.prod.yml     # Production compose file
├── deploy-ec2.sh               # EC2 deployment script
├── DEPLOYMENT.md               # Deployment guide
├── .env.example                # Environment template
├── server.js                   # Express server entry
└── package.json                # Backend dependencies
```

**Key Features:**
- 🚀 Express.js REST API
- 🗄️ PostgreSQL database
- 📊 Comprehensive problem tracking
- 📅 Calendar with events/tasks/notes
- 🔄 Spaced repetition review system
- 💾 Automated backups to S3
- 🔍 Advanced filtering & search

---

### 📚 Documentation (`docs/`)

```
docs/
├── DATABASE_INITIALIZATION_PROCESS.md
├── DATABASE_PERSISTENCE.md
├── HOW_SOLVED_PROBLEMS_ARE_SAVED.md
├── BACKUP_RESTORE_GUIDE.md
├── DOCKER_SETUP_WINDOWS.md
├── AWS_EC2_DEPLOYMENT.md
├── AWS_EC2_AMAZON_LINUX.md
├── UBUNTU_VS_AMAZON_LINUX.md
├── AWS_S3_INTEGRATION.md
└── implementation-history/      # Feature implementation logs
```

---

### 🔨 Scripts (`scripts/`)

```
scripts/
├── backup.ps1                   # Windows backup script
├── restore.ps1                  # Windows restore script
├── deploy-ec2.sh               # EC2 deployment (Ubuntu)
├── deploy-ec2-amazon-linux.sh  # EC2 deployment (Amazon Linux)
└── restructure-project.ps1     # Project restructuring
```

---

### 🐳 Docker Configuration

```
Root Level:
├── docker-compose.yml           # Development environment
├── Dockerfile                   # Legacy (can be removed)
└── Dockerfile.dev              # Legacy (can be removed)

Server Level:
├── server/Dockerfile            # ✅ Production backend image
├── server/docker-compose.prod.yml  # ✅ Production deployment
└── server/.dockerignore        # ✅ Docker ignore rules
```

---

### 📋 Configuration Files

```
Root Level:
├── .env                        # Environment variables (gitignored)
├── .env.example               # Environment template
├── package.json               # Root package (scripts)
├── .gitignore                 # Git ignore rules
├── .eslintrc.json            # ESLint configuration
├── .prettierrc               # Prettier configuration
└── .prettierignore           # Prettier ignore rules

Database:
├── comprehensive-schema.sql   # Database schema
└── reference_data.sql        # Reference data
```

---

## 🗄️ Database Schema

### Core Tables

```sql
problems                    # LeetCode problems
├── id (PK)
├── title
├── difficulty
├── category
├── patterns
├── notes (JSON - Novel editor content)
└── solved_at

calendar_events            # Calendar events
├── id (PK)
├── date
├── title
├── description
└── event_type

calendar_tasks            # Calendar tasks
├── id (PK)
├── date
├── title
├── completed
└── priority

calendar_day_notes        # Daily notes (Novel editor)
├── id (PK)
├── date
├── notes (JSON)
└── updated_at

reviews                   # Spaced repetition
├── id (PK)
├── problem_id (FK)
├── next_review_date
└── review_count

patterns                  # Problem patterns
├── id (PK)
├── name
└── description

concepts                  # Programming concepts
├── id (PK)
├── name
└── description
```

---

## 🔄 Data Flow

### Problem Solving Flow
```
User solves problem
    ↓
Frontend: NovelNotesTab (rich text editor)
    ↓
API: POST /api/problems/:id/solve
    ↓
Backend: problemController.markAsSolved()
    ↓
Database: Update problem + Create review
    ↓
Response: Updated problem data
```

### Calendar Flow
```
User creates event/task/note
    ↓
Frontend: Calendar components
    ↓
API: POST /api/calendar/*
    ↓
Backend: calendarController
    ↓
Database: Insert into calendar_* tables
    ↓
Response: Created item
```

---

## 🚀 Tech Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **Editor**: Novel.sh (Tiptap-based)
- **Styling**: CSS + Tailwind-like utilities
- **State**: React Hooks
- **HTTP**: Fetch API

### Backend
- **Runtime**: Node.js 18
- **Framework**: Express.js
- **Database**: PostgreSQL 15
- **ORM**: Raw SQL queries
- **Validation**: Manual validation

### DevOps
- **Containerization**: Docker + Docker Compose
- **Cloud**: AWS (EC2, S3, RDS)
- **CI/CD**: Manual deployment scripts
- **Backup**: Automated S3 backups

---

## 📦 Dependencies

### Frontend Key Packages
```json
{
  "react": "^18.2.0",
  "novel": "^1.0.2",
  "@tiptap/react": "^2.x",
  "lucide-react": "^0.544.0",
  "highlight.js": "^11.x"
}
```

### Backend Key Packages
```json
{
  "express": "^4.18.2",
  "pg": "^8.11.3",
  "cors": "^2.8.5",
  "dotenv": "^16.3.1",
  "aws-sdk": "^2.x"
}
```

---

## 🔐 Environment Variables

### Required
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=leetcodepractice
DB_USER=leetcodeuser
DB_PASSWORD=your_password

# Server
PORT=3001
NODE_ENV=development
```

### Optional (for S3 backups)
```env
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket
```

---

## 🎯 Key Features

### ✅ Implemented
- ✅ Problem tracking with rich notes
- ✅ Calendar with events/tasks/notes
- ✅ Spaced repetition review system
- ✅ Pattern & concept management
- ✅ Similar problems suggestions
- ✅ Rich text editor (Novel.sh)
- ✅ Image upload & resize
- ✅ YouTube embed
- ✅ AI assistance integration
- ✅ Docker deployment
- ✅ S3 backups

### 🚧 In Progress
- 🚧 S3 image upload (replacing base64)
- 🚧 Frontend deployment (Vercel/Netlify)

### 📋 Planned
- 📋 User authentication
- 📋 Multi-user support
- 📋 Real-time collaboration
- 📋 Mobile app

---

## 📖 Getting Started

### Development
```bash
# Install dependencies
npm install
cd client && npm install
cd ../server && npm install

# Start with Docker
docker-compose up -d

# Or start manually
# Terminal 1: Backend
cd server && npm start

# Terminal 2: Frontend
cd client && npm start
```

### Production (EC2)
```bash
cd server
./deploy-ec2.sh
```

See `server/DEPLOYMENT.md` for detailed instructions.

---

## 📞 Support & Documentation

- **Main Docs**: `DOCUMENTATION_INDEX.md`
- **Docker Setup**: `DOCKER_STRUCTURE.md`
- **Deployment**: `server/DEPLOYMENT.md`
- **Backup/Restore**: `docs/BACKUP_RESTORE_GUIDE.md`
- **Database**: `docs/DATABASE_PERSISTENCE.md`

---

**Last Updated**: 2024
**Version**: 2.0 (Restructured with separate Docker configs)
