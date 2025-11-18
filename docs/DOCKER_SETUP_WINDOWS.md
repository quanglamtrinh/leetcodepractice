# Docker Setup Guide for Windows

## Step 1: Install Docker Desktop

1. **Download Docker Desktop for Windows**:
   - Visit: https://www.docker.com/products/docker-desktop/
   - Click "Download for Windows"
   - Or direct link: https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe

2. **System Requirements**:
   - Windows 10 64-bit: Pro, Enterprise, or Education (Build 19041 or higher)
   - OR Windows 11 64-bit
   - WSL 2 feature enabled (installer will help with this)
   - Virtualization enabled in BIOS

3. **Run the Installer**:
   - Double-click `Docker Desktop Installer.exe`
   - Follow the installation wizard
   - When prompted, ensure "Use WSL 2 instead of Hyper-V" is checked (recommended)
   - Click "Ok" to proceed

4. **Restart Your Computer**:
   - Docker Desktop requires a restart to complete installation

5. **Start Docker Desktop**:
   - Launch Docker Desktop from Start menu
   - Wait for Docker to start (you'll see the whale icon in system tray)
   - Accept the service agreement if prompted

## Step 2: Verify Installation

Open PowerShell or Command Prompt and run:

```powershell
docker --version
docker-compose --version
```

You should see version numbers like:
```
Docker version 24.x.x
Docker Compose version v2.x.x
```

## Step 3: Test Docker

Run a test container:

```powershell
docker run hello-world
```

If you see "Hello from Docker!", you're all set!

## Step 4: Configure Docker (Optional)

1. **Right-click Docker Desktop icon** in system tray
2. **Go to Settings**:
   - **Resources → Advanced**: Adjust CPU/Memory if needed (defaults are usually fine)
   - **Docker Engine**: Leave default settings
   - **WSL Integration**: Ensure your distro is enabled if using WSL

## Step 5: Run Your LeetCode Practice App

Once Docker is installed, navigate to your project directory:

```powershell
# Navigate to your project (adjust path as needed)
cd "D:\Quang Lam\Coding\Project\leetcodepractice"

# Create .env file if you don't have one
# You can copy from env.example or create manually
```

Create a `.env` file with:
```env
DB_NAME=leetcode_practice
DB_USER=leetcodeuser
DB_PASSWORD=changeme
DB_HOST=postgres
DB_PORT=5432
PORT=3001
NODE_ENV=development
```

Then start everything:

```powershell
# Start all services (PostgreSQL + Express app)
docker-compose up -d

# View logs
docker-compose logs -f

# Check if containers are running
docker ps

# Access your app at http://localhost:3001
```

## Common Issues & Solutions

### Issue: "WSL 2 installation is incomplete"

**Solution**:
1. Open PowerShell as Administrator
2. Run: `wsl --install`
3. Restart computer
4. Start Docker Desktop again

### Issue: "Hardware assisted virtualization is not enabled"

**Solution**:
1. Restart computer and enter BIOS (usually F2, F10, or Del during startup)
2. Find "Virtualization Technology" or "Intel VT-x" / "AMD-V"
3. Enable it
4. Save and exit BIOS

### Issue: Docker Desktop won't start

**Solution**:
1. Check Windows Updates are installed
2. Ensure Hyper-V or WSL 2 is enabled:
   ```powershell
   # Run as Administrator
   dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
   dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
   ```
3. Restart computer

### Issue: "docker: command not found" after installation

**Solution**:
1. Ensure Docker Desktop is running (check system tray)
2. Restart your terminal/PowerShell
3. If still not working, add Docker to PATH:
   - Default location: `C:\Program Files\Docker\Docker\resources\bin`

## Useful Docker Commands

```powershell
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f app

# Rebuild after code changes
docker-compose up -d --build

# Remove everything including volumes (fresh start)
docker-compose down -v

# Access PostgreSQL directly
docker-compose exec postgres psql -U leetcodeuser -d leetcode_practice

# Execute commands in app container
docker-compose exec app npm run setup

# View running containers
docker ps

# View all containers (including stopped)
docker ps -a

# Remove unused images/containers
docker system prune
```

## Next Steps

After Docker is running:

1. ✅ Verify containers are running: `docker ps`
2. ✅ Check app health: `curl http://localhost:3001/api/health`
3. ✅ View logs: `docker-compose logs -f`
4. ✅ Access your app: http://localhost:3001

## Alternative: Docker without Docker Desktop

If you can't use Docker Desktop (licensing or system requirements), consider:

1. **Rancher Desktop**: Free, open-source alternative
   - Download: https://rancherdesktop.io/

2. **Podman Desktop**: Docker-compatible alternative
   - Download: https://podman-desktop.io/

3. **WSL 2 + Docker Engine**: Manual installation in WSL
   - More complex but fully free

## Resources

- Docker Desktop Documentation: https://docs.docker.com/desktop/windows/
- Docker Compose Documentation: https://docs.docker.com/compose/
- WSL 2 Setup: https://learn.microsoft.com/en-us/windows/wsl/install

---

Need help? Check the [Deployment Guide](./DEPLOYMENT.md) for more details.
