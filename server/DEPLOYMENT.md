# Backend Deployment Guide

## 📋 Prerequisites

- Docker & Docker Compose installed
- EC2 instance with Ubuntu/Amazon Linux
- Port 3001 open in security group
- `.env` file configured

## 🚀 Quick Deploy on EC2

### 1. Setup EC2 Instance

```bash
# Update system
sudo yum update -y  # Amazon Linux
# or
sudo apt update && sudo apt upgrade -y  # Ubuntu

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login again for docker group to take effect
```

### 2. Clone & Configure

```bash
# Clone repository (or upload server folder)
git clone <your-repo-url>
cd leetcodepractice/server

# Create .env file
cp .env.example .env
nano .env
```

Required `.env` variables:
```env
DB_NAME=leetcodepractice
DB_USER=leetcodeuser
DB_PASSWORD=your_secure_password_here
PORT=3001
NODE_ENV=production
```

### 3. Deploy

```bash
# Make deploy script executable
chmod +x deploy-ec2.sh

# Run deployment
./deploy-ec2.sh
```

Or manually:
```bash
# Build and start services
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f backend
```

## 🔍 Verify Deployment

```bash
# Health check
curl http://localhost:3001/api/health

# Check logs
docker-compose -f docker-compose.prod.yml logs backend

# Check database
docker exec -it leetcode-postgres-prod psql -U leetcodeuser -d leetcodepractice
```

## 🔄 Update Deployment

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
```

## 🛑 Stop Services

```bash
# Stop all services
docker-compose -f docker-compose.prod.yml down

# Stop and remove volumes (⚠️ deletes database data)
docker-compose -f docker-compose.prod.yml down -v
```

## 📊 Monitoring

```bash
# View all logs
docker-compose -f docker-compose.prod.yml logs -f

# View backend logs only
docker-compose -f docker-compose.prod.yml logs -f backend

# View database logs only
docker-compose -f docker-compose.prod.yml logs -f postgres

# Check resource usage
docker stats
```

## 🔐 Security Checklist

- [ ] Change default database password
- [ ] Configure firewall (only allow necessary ports)
- [ ] Setup SSL/TLS certificate
- [ ] Enable database backups
- [ ] Setup monitoring and alerts
- [ ] Configure log rotation

## 🌐 Nginx Reverse Proxy (Optional)

If you want to use Nginx as reverse proxy:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 📦 Backup & Restore

### Backup Database
```bash
docker exec leetcode-postgres-prod pg_dump -U leetcodeuser leetcodepractice > backup.sql
```

### Restore Database
```bash
cat backup.sql | docker exec -i leetcode-postgres-prod psql -U leetcodeuser -d leetcodepractice
```

## 🐛 Troubleshooting

### Container won't start
```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs

# Check if ports are in use
sudo netstat -tulpn | grep 3001
```

### Database connection issues
```bash
# Check if postgres is healthy
docker ps
docker logs leetcode-postgres-prod

# Test connection
docker exec -it leetcode-postgres-prod psql -U leetcodeuser -d leetcodepractice
```

### Out of disk space
```bash
# Clean up Docker
docker system prune -a
docker volume prune
```

## 📞 Support

For issues, check:
- Application logs: `docker-compose logs backend`
- Database logs: `docker-compose logs postgres`
- System logs: `journalctl -u docker`
