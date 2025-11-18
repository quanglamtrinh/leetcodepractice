# Backend Deployment Guide - EC2 with Docker

Hướng dẫn deploy backend LeetCode Practice lên AWS EC2 sử dụng Docker.

## 📋 Prerequisites

- AWS Account
- EC2 instance (Ubuntu 22.04 hoặc Amazon Linux 2)
- Domain name (optional, cho SSL)
- Basic Linux knowledge

## 🚀 Quick Start (3 bước)

```bash
# 1. Setup EC2 và install Docker
# 2. Clone code và config .env
# 3. Run deploy script
./deploy-ec2.sh
```

---

## 📖 Chi tiết từng bước

### Bước 1: Tạo EC2 Instance

#### 1.1. Launch EC2 Instance

1. Đăng nhập AWS Console → EC2
2. Click **"Launch Instance"**
3. Chọn cấu hình:
   - **Name**: `leetcode-backend`
   - **AMI**: Ubuntu Server 22.04 LTS (hoặc Amazon Linux 2)
   - **Instance type**: `t2.micro` (free tier) hoặc `t3.small` (production)
   - **Key pair**: Tạo mới hoặc chọn existing
   - **Storage**: 20GB gp3

#### 1.2. Configure Security Group

Mở các ports sau:

| Type | Port | Source | Description |
|------|------|--------|-------------|
| SSH | 22 | Your IP | SSH access |
| Custom TCP | 3001 | 0.0.0.0/0 | Backend API |
| PostgreSQL | 5432 | Security Group | Database (nếu dùng RDS) |

#### 1.3. Connect to EC2

```bash
# Download key pair (.pem file)
chmod 400 your-key.pem

# SSH vào EC2
ssh -i your-key.pem ubuntu@<EC2-PUBLIC-IP>
# hoặc
ssh -i your-key.pem ec2-user@<EC2-PUBLIC-IP>  # Amazon Linux
```

---

### Bước 2: Setup EC2 Environment

#### 2.1. Update System

**Ubuntu:**
```bash
sudo apt update && sudo apt upgrade -y
```

**Amazon Linux:**
```bash
sudo yum update -y
```

#### 2.2. Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version

# IMPORTANT: Logout và login lại để docker group có hiệu lực
exit
# SSH lại vào EC2
```

#### 2.3. Install Git (nếu chưa có)

```bash
# Ubuntu
sudo apt install git -y

# Amazon Linux
sudo yum install git -y
```

---

### Bước 3: Deploy Application

#### 3.1. Clone Repository

```bash
# Clone repo (hoặc upload code)
git clone https://github.com/your-username/leetcodepractice.git
cd leetcodepractice/server

# Hoặc upload code bằng scp
# scp -i your-key.pem -r ./server ubuntu@<EC2-IP>:~/
```

#### 3.2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

**Required `.env` variables:**
```env
# Database Configuration
DB_NAME=leetcodepractice
DB_USER=leetcodeuser
DB_PASSWORD=your_secure_password_here_change_this

# Server Configuration
PORT=3001
NODE_ENV=production

# Optional: S3 for backups
# AWS_ACCESS_KEY_ID=your_key
# AWS_SECRET_ACCESS_KEY=your_secret
# AWS_REGION=us-east-1
# S3_BUCKET_NAME=leetcode-backups
```

**⚠️ QUAN TRỌNG:** Đổi `DB_PASSWORD` thành password mạnh!

#### 3.3. Copy Database Schema

```bash
# Copy schema file vào server folder
cp ../comprehensive-schema.sql .
```

#### 3.4. Deploy

**Option A: Sử dụng deploy script (Khuyến nghị)**

```bash
# Make script executable
chmod +x deploy-ec2.sh

# Run deployment
./deploy-ec2.sh
```

**Option B: Manual deployment**

```bash
# Build và start services
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

---

### Bước 4: Verify Deployment

#### 4.1. Check Services

```bash
# Check running containers
docker ps

# Should see:
# - leetcode-backend-prod
# - leetcode-postgres-prod
```

#### 4.2. Test API

```bash
# Health check
curl http://localhost:3001/api/health

# Expected response:
# {"status":"ok","database":"connected"}

# Test from outside
curl http://<EC2-PUBLIC-IP>:3001/api/health
```

#### 4.3. Check Logs

```bash
# Backend logs
docker-compose -f docker-compose.prod.yml logs backend

# Database logs
docker-compose -f docker-compose.prod.yml logs postgres

# Follow logs
docker-compose -f docker-compose.prod.yml logs -f
```

---

## 🔄 Update & Maintenance

### Update Code

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build

# Or use deploy script
./deploy-ec2.sh
```

### Backup Database

```bash
# Manual backup
docker exec leetcode-postgres-prod pg_dump -U leetcodeuser leetcodepractice > backup_$(date +%Y%m%d).sql

# Restore from backup
cat backup_20241120.sql | docker exec -i leetcode-postgres-prod psql -U leetcodeuser -d leetcodepractice
```

### View Logs

```bash
# All logs
docker-compose -f docker-compose.prod.yml logs

# Specific service
docker-compose -f docker-compose.prod.yml logs backend
docker-compose -f docker-compose.prod.yml logs postgres

# Follow logs (real-time)
docker-compose -f docker-compose.prod.yml logs -f backend

# Last 100 lines
docker-compose -f docker-compose.prod.yml logs --tail=100 backend
```

### Restart Services

```bash
# Restart all
docker-compose -f docker-compose.prod.yml restart

# Restart specific service
docker-compose -f docker-compose.prod.yml restart backend
```

### Stop Services

```bash
# Stop all services
docker-compose -f docker-compose.prod.yml down

# Stop and remove volumes (⚠️ XÓA DATABASE)
docker-compose -f docker-compose.prod.yml down -v
```

---

## 🔐 Security Best Practices

### 1. Firewall Configuration

```bash
# Ubuntu: UFW
sudo ufw allow 22/tcp
sudo ufw allow 3001/tcp
sudo ufw enable

# Amazon Linux: firewalld
sudo firewall-cmd --permanent --add-port=22/tcp
sudo firewall-cmd --permanent --add-port=3001/tcp
sudo firewall-cmd --reload
```

### 2. SSL/HTTPS với Nginx (Optional)

```bash
# Install Nginx
sudo apt install nginx -y  # Ubuntu
sudo yum install nginx -y  # Amazon Linux

# Configure reverse proxy
sudo nano /etc/nginx/sites-available/leetcode
```

**Nginx config:**
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
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/leetcode /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Install SSL with Let's Encrypt
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

### 3. Automated Backups

```bash
# Create backup script
nano ~/backup.sh
```

**backup.sh:**
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=~/backups
mkdir -p $BACKUP_DIR

docker exec leetcode-postgres-prod pg_dump -U leetcodeuser leetcodepractice > $BACKUP_DIR/backup_$DATE.sql

# Keep only last 7 days
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete

echo "Backup completed: backup_$DATE.sql"
```

```bash
# Make executable
chmod +x ~/backup.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add line:
0 2 * * * ~/backup.sh
```

---

## 🐛 Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs

# Check if ports are in use
sudo netstat -tulpn | grep 3001
sudo netstat -tulpn | grep 5432

# Kill process using port
sudo kill -9 $(sudo lsof -t -i:3001)
```

### Database connection failed

```bash
# Check if postgres is running
docker ps | grep postgres

# Check postgres logs
docker logs leetcode-postgres-prod

# Test connection
docker exec -it leetcode-postgres-prod psql -U leetcodeuser -d leetcodepractice

# Check environment variables
docker exec leetcode-backend-prod env | grep DB_
```

### Out of disk space

```bash
# Check disk usage
df -h

# Clean up Docker
docker system prune -a
docker volume prune

# Remove old images
docker image prune -a
```

### Permission denied

```bash
# Fix docker permissions
sudo usermod -aG docker $USER
# Logout and login again

# Fix file permissions
sudo chown -R $USER:$USER ~/leetcodepractice
```

---

## 📊 Monitoring

### Resource Usage

```bash
# Docker stats
docker stats

# System resources
htop  # Install: sudo apt install htop

# Disk usage
df -h
du -sh ~/leetcodepractice/*
```

### Application Logs

```bash
# Real-time logs
docker-compose -f docker-compose.prod.yml logs -f backend

# Search logs
docker-compose -f docker-compose.prod.yml logs backend | grep ERROR

# Export logs
docker-compose -f docker-compose.prod.yml logs backend > backend.log
```

---

## 💰 Cost Optimization

### AWS Free Tier
- **EC2 t2.micro**: 750 hours/month free (12 months)
- **EBS**: 30GB free
- **Data Transfer**: 15GB out free

### Cost-Effective Setup
- **EC2**: t2.micro ($0) hoặc t3.small (~$15/month)
- **RDS** (optional): db.t3.micro (~$15/month)
- **Total**: $0-30/month

### Reduce Costs
- Stop EC2 khi không dùng
- Use spot instances
- Optimize Docker images
- Enable CloudWatch alarms

---

## 🎯 Next Steps

- [ ] Setup automated backups to S3
- [ ] Configure SSL/HTTPS
- [ ] Setup monitoring (CloudWatch)
- [ ] Configure log rotation
- [ ] Setup CI/CD pipeline
- [ ] Add health check monitoring
- [ ] Configure auto-scaling (optional)

---

## 📞 Support

**Documentation:**
- Main docs: `../docs/`
- Docker structure: `../DOCKER_STRUCTURE.md`
- Project structure: `../PROJECT_STRUCTURE.md`

**Common Issues:**
- Check logs first: `docker-compose logs`
- Verify .env file
- Check security groups
- Test locally with docker-compose first

---

**Last Updated**: November 2024
