# 🚀 Get Started with Docker

## Your Current Status

✅ Docker configuration files are ready  
✅ Environment variables configured  
❌ Docker Desktop not installed yet  

## What You Need to Do

### Step 1: Install Docker Desktop (15 minutes)

1. **Download Docker Desktop**:
   - Go to: https://www.docker.com/products/docker-desktop/
   - Click "Download for Windows"
   - Run the installer

2. **Install**:
   - Follow the installation wizard
   - Choose "Use WSL 2" when prompted (recommended)
   - Restart your computer when done

3. **Start Docker Desktop**:
   - Find "Docker Desktop" in Start menu
   - Launch it
   - Wait for the whale icon to appear in system tray (bottom right)
   - You'll see "Docker Desktop is running" when ready

4. **Verify Installation**:
   Open PowerShell and run:
   ```powershell
   docker --version
   docker-compose --version
   ```
   
   You should see version numbers. If you do, you're ready! 🎉

**Need help?** See detailed guide: [docs/DOCKER_SETUP_WINDOWS.md](docs/DOCKER_SETUP_WINDOWS.md)

### Step 2: Start Your App (2 minutes)

Once Docker is installed, choose one option:

**Option A: PowerShell Script (Recommended)**
```powershell
.\docker-start.ps1
```

**Option B: Batch Script**
```cmd
docker-start.bat
```

**Option C: Manual Commands**
```powershell
docker-compose up -d
docker-compose logs -f
```

### Step 3: Access Your App

Open your browser and go to:
- **App**: http://localhost:3001
- **Health Check**: http://localhost:3001/api/health

That's it! 🎉

## What Gets Installed?

When you run `docker-compose up -d`, Docker will:

1. ✅ Download PostgreSQL 15 image (~80MB)
2. ✅ Build your Express app image
3. ✅ Create a database with your schema
4. ✅ Start both containers
5. ✅ Connect them together

Total time: 2-5 minutes on first run (downloads images)  
Subsequent starts: 10-30 seconds

## Files Created for You

I've set up everything you need:

```
leetcodepractice/
├── Dockerfile                    ✅ Already exists
├── docker-compose.yml            ✅ Already exists
├── .env                          ✅ Already exists
├── .dockerignore                 ✅ Already exists
├── docker-start.ps1              ✅ NEW - PowerShell script
├── docker-start.bat              ✅ NEW - Batch script
├── GET_STARTED.md                ✅ NEW - This file
├── DOCKER_QUICKSTART.md          ✅ NEW - Quick reference
└── docs/
    ├── DOCKER_SETUP_WINDOWS.md   ✅ NEW - Detailed setup guide
    └── DEPLOYMENT.md             ✅ Already exists
```

## Quick Reference

### Start/Stop Commands

```powershell
# Start everything
docker-compose up -d

# Stop everything
docker-compose down

# View logs
docker-compose logs -f

# Restart
docker-compose restart

# Rebuild after code changes
docker-compose up -d --build
```

### Check Status

```powershell
# See running containers
docker ps

# Check app health
curl http://localhost:3001/api/health

# View detailed logs
docker-compose logs app
docker-compose logs postgres
```

### Database Access

```powershell
# Connect to PostgreSQL
docker-compose exec postgres psql -U leetcodeuser -d leetcode_practice

# Run migrations
docker-compose exec app npm run db:migrate

# Seed data
docker-compose exec app npm run db:seed
```

## Troubleshooting

### Docker Desktop won't install?
- Check Windows version (need Windows 10 Pro/Enterprise or Windows 11)
- Enable virtualization in BIOS
- See: [docs/DOCKER_SETUP_WINDOWS.md](docs/DOCKER_SETUP_WINDOWS.md)

### Containers won't start?
```powershell
# Check logs
docker-compose logs

# Try fresh start
docker-compose down -v
docker-compose up -d
```

### Port already in use?
```powershell
# Find what's using port 3001
netstat -ano | findstr :3001

# Kill the process or change PORT in .env
```

## Next Steps After Setup

1. ✅ Verify containers: `docker ps`
2. ✅ Test health endpoint: http://localhost:3001/api/health
3. ✅ Import problems: `docker-compose exec app npm run import-data`
4. ✅ Start coding!

## Why Docker?

- ✅ **No PostgreSQL installation needed** - Runs in container
- ✅ **Consistent environment** - Works same on all machines
- ✅ **Easy cleanup** - `docker-compose down -v` removes everything
- ✅ **Production-ready** - Same setup works for deployment
- ✅ **Isolated** - Won't conflict with other projects

## Resources

- **Quick Start**: [DOCKER_QUICKSTART.md](DOCKER_QUICKSTART.md)
- **Windows Setup**: [docs/DOCKER_SETUP_WINDOWS.md](docs/DOCKER_SETUP_WINDOWS.md)
- **Deployment**: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- **Docker Docs**: https://docs.docker.com/desktop/windows/

---

**Ready to start?** Install Docker Desktop, then run `.\docker-start.ps1` 🚀
