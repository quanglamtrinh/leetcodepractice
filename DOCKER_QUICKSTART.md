# 🐳 Docker Quick Start

Get your LeetCode Practice App running with Docker in 3 steps!

## Prerequisites

You need Docker Desktop installed on Windows. If you don't have it:

👉 **[Follow the detailed setup guide](docs/DOCKER_SETUP_WINDOWS.md)**

Quick install:
1. Download: https://www.docker.com/products/docker-desktop/
2. Install and restart computer
3. Start Docker Desktop (wait for whale icon in system tray)

## Quick Start

### Option 1: PowerShell Script (Easiest)

```powershell
# Run the automated setup script
.\docker-start.ps1
```

This script will:
- ✅ Check Docker installation
- ✅ Verify .env configuration
- ✅ Start PostgreSQL + Express app
- ✅ Test health endpoint
- ✅ Show you useful commands

### Option 2: Manual Commands

```powershell
# Start everything
docker-compose up -d

# View logs
docker-compose logs -f

# Check status
docker ps
```

## Access Your App

Once running, open your browser:
- **App**: http://localhost:3001
- **Health Check**: http://localhost:3001/api/health

## Common Commands

```powershell
# View logs (follow mode)
docker-compose logs -f app

# Stop everything
docker-compose down

# Restart services
docker-compose restart

# Rebuild after code changes
docker-compose up -d --build

# Fresh start (removes database data)
docker-compose down -v
docker-compose up -d

# Access PostgreSQL
docker-compose exec postgres psql -U leetcodeuser -d leetcode_practice

# Run commands in app container
docker-compose exec app npm run setup
```

## What's Running?

After `docker-compose up -d`, you'll have:

1. **PostgreSQL Database** (port 5432)
   - Container: `leetcode-postgres`
   - Database: `leetcode_practice`
   - User: `leetcodeuser`

2. **Express API Server** (port 3001)
   - Container: `leetcode-app`
   - Automatically connects to PostgreSQL
   - Serves your React frontend

## Troubleshooting

### "Docker command not found"
- Install Docker Desktop: [Setup Guide](docs/DOCKER_SETUP_WINDOWS.md)
- Make sure Docker Desktop is running

### "Port already in use"
```powershell
# Check what's using the port
netstat -ano | findstr :3001
netstat -ano | findstr :5432

# Stop other services or change ports in .env
```

### "Container won't start"
```powershell
# View detailed logs
docker-compose logs app
docker-compose logs postgres

# Try fresh start
docker-compose down -v
docker-compose up -d
```

### "Can't connect to database"
```powershell
# Check if PostgreSQL is healthy
docker-compose ps

# Should show "healthy" status
# If not, check logs:
docker-compose logs postgres
```

## Environment Configuration

Your `.env` file controls the setup:

```env
DB_HOST=postgres          # Use 'postgres' for Docker, 'localhost' for local dev
DB_PORT=5432
DB_NAME=leetcode_practice
DB_USER=leetcodeuser
DB_PASSWORD=changeme      # Change this!
PORT=3001
NODE_ENV=development
```

## Next Steps

1. ✅ Verify containers are running: `docker ps`
2. ✅ Check app health: http://localhost:3001/api/health
3. ✅ Import LeetCode problems: `docker-compose exec app npm run import-data`
4. ✅ Start developing!

## More Information

- **Detailed Docker Setup**: [docs/DOCKER_SETUP_WINDOWS.md](docs/DOCKER_SETUP_WINDOWS.md)
- **Deployment Guide**: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- **Main README**: [README.md](README.md)

## Need Help?

Common resources:
- Docker Desktop Docs: https://docs.docker.com/desktop/windows/
- Docker Compose Docs: https://docs.docker.com/compose/
- Project Issues: Check your repository issues page

---

**Pro Tip**: Keep Docker Desktop running in the background while developing. It uses minimal resources when idle.
