# AWS EC2 Deployment Guide

Complete guide to deploy your LeetCode Practice App to AWS EC2.

---

## 🎯 Architecture Overview

```
Internet
    ↓
AWS EC2 Instance (Ubuntu)
    ├── Docker
    │   ├── PostgreSQL Container (port 5432)
    │   └── App Container (port 3001)
    ├── Nginx (reverse proxy, port 80/443)
    └── SSL Certificate (Let's Encrypt)
```

---

## 📋 Prerequisites

- AWS Account
- Domain name (optional, but recommended)
- SSH key pair
- Basic Linux knowledge

---

## 🚀 Step-by-Step Deployment

### Step 1: Launch EC2 Instance

#### 1.1 Go to AWS Console
- Navigate to EC2 Dashboard
- Click "Launch Instance"

#### 1.2 Configure Instance

**Name:** `leetcode-practice-app`

**AMI:** Ubuntu Server 22.04 LTS (Free tier eligible)

**Instance Type:** 
- Development: `t2.micro` (1 vCPU, 1GB RAM) - Free tier
- Production: `t2.small` (1 vCPU, 2GB RAM) - $0.023/hour

**Key Pair:**
- Create new key pair: `leetcode-practice-key.pem`
- Download and save securely

**Network Settings:**
- Create security group: `leetcode-practice-sg`
- Allow SSH (port 22) from your IP
- Allow HTTP (port 80) from anywhere
- Allow HTTPS (port 443) from anywhere
- Allow Custom TCP (port 3001) from anywhere (for testing)

**Storage:**
- 20 GB gp3 (General Purpose SSD)

#### 1.3 Launch Instance

Click "Launch Instance" and wait for it to start.

---

### Step 2: Connect to EC2 Instance

#### 2.1 Get Instance Public IP

From EC2 Dashboard, copy your instance's **Public IPv4 address**

Example: `54.123.45.67`

#### 2.2 Connect via SSH

**Windows (PowerShell):**
```powershell
# Set permissions on key file
icacls "leetcode-practice-key.pem" /inheritance:r
icacls "leetcode-practice-key.pem" /grant:r "$($env:USERNAME):(R)"

# Connect
ssh -i "leetcode-practice-key.pem" ubuntu@54.123.45.67
```

**Mac/Linux:**
```bash
chmod 400 leetcode-practice-key.pem
ssh -i leetcode-practice-key.pem ubuntu@54.123.45.67
```

---

### Step 3: Install Docker on EC2

```bash
# Update system
sudo apt update
sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version

# Logout and login again for group changes
exit
# SSH back in
ssh -i "leetcode-practice-key.pem" ubuntu@54.123.45.67
```

---

### Step 4: Transfer Project Files to EC2

#### Option A: Using Git (Recommended)

```bash
# On EC2 instance
cd ~
git clone https://github.com/YOUR_USERNAME/leetcodepractice.git
cd leetcodepractice
```

#### Option B: Using SCP (Direct Transfer)

**From your local machine:**

```powershell
# Windows PowerShell
scp -i "leetcode-practice-key.pem" -r D:\Quang` Lam\Coding\Project\leetcodepractice ubuntu@54.123.45.67:~/
```

```bash
# Mac/Linux
scp -i leetcode-practice-key.pem -r /path/to/leetcodepractice ubuntu@54.123.45.67:~/
```

---

### Step 5: Configure Environment Variables

```bash
# On EC2 instance
cd ~/leetcodepractice

# Create .env file
nano .env
```

**Add these variables:**

```env
# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_NAME=leetcodepractice
DB_USER=leetcodeuser
DB_PASSWORD=YOUR_SECURE_PASSWORD_HERE

# Application Configuration
PORT=3001
NODE_ENV=production

# Optional: AWS S3 (for backups)
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=leetcode-backups
```

**Save:** `Ctrl+X`, then `Y`, then `Enter`

---

### Step 6: Update docker-compose.yml for Production

```bash
nano docker-compose.yml
```

**Update to:**

```yaml
services:
  postgres:
    image: postgres:15-alpine
    container_name: leetcode-postgres
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./comprehensive-schema.sql:/docker-entrypoint-initdb.d/01-schema.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - leetcode-network
    restart: always  # Auto-restart on failure

  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
      target: development
    container_name: leetcode-app
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: ${DB_NAME}
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      PORT: 3001
      NODE_ENV: production
    ports:
      - "3001:3001"
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - .:/app
      - /app/node_modules
      - /app/client/node_modules
    command: npm run dev
    networks:
      - leetcode-network
    restart: always  # Auto-restart on failure

volumes:
  postgres_data:
    driver: local

networks:
  leetcode-network:
    driver: bridge
```

---

### Step 7: Start Application

```bash
# Build and start containers
docker-compose up -d

# Check status
docker ps

# View logs
docker-compose logs -f

# Test application
curl http://localhost:3001/api/health
```

**Expected output:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-16T...",
  "database": "connected"
}
```

---

### Step 8: Import Data

```bash
# Import problems from CSV
docker exec -it leetcode-app node server/scripts/importProblems.js

# Verify import
docker exec -it leetcode-postgres psql -U leetcodeuser -d leetcodepractice -c "SELECT COUNT(*) FROM problems;"
```

---

### Step 9: Setup Nginx Reverse Proxy

#### 9.1 Install Nginx

```bash
sudo apt install nginx -y
```

#### 9.2 Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/leetcode-practice
```

**Add configuration:**

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain or EC2 IP

    # Increase upload size for large notes
    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /api/health {
        proxy_pass http://localhost:3001/api/health;
        access_log off;
    }
}
```

#### 9.3 Enable Site

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/leetcode-practice /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

### Step 10: Setup SSL Certificate (HTTPS)

#### 10.1 Install Certbot

```bash
sudo apt install certbot python3-certbot-nginx -y
```

#### 10.2 Get SSL Certificate

```bash
# Replace with your domain
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Follow prompts:
# - Enter email
# - Agree to terms
# - Choose redirect HTTP to HTTPS (option 2)
```

#### 10.3 Auto-Renewal

```bash
# Test renewal
sudo certbot renew --dry-run

# Certbot automatically sets up cron job for renewal
```

---

### Step 11: Setup Automatic Backups

#### 11.1 Create Backup Script

```bash
nano ~/backup-db.sh
```

**Add:**

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/ubuntu/backups"
mkdir -p $BACKUP_DIR

# Backup database
docker exec leetcode-postgres pg_dump -U leetcodeuser leetcodepractice > $BACKUP_DIR/backup_$DATE.sql

# Keep only last 7 days
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete

echo "Backup completed: backup_$DATE.sql"
```

**Make executable:**

```bash
chmod +x ~/backup-db.sh
```

#### 11.2 Setup Cron Job

```bash
crontab -e
```

**Add (daily backup at 2 AM):**

```cron
0 2 * * * /home/ubuntu/backup-db.sh >> /home/ubuntu/backup.log 2>&1
```

---

### Step 12: Setup Monitoring

#### 12.1 Install Monitoring Tools

```bash
# Install htop for system monitoring
sudo apt install htop -y

# Install netdata for web-based monitoring
bash <(curl -Ss https://my-netdata.io/kickstart.sh)
```

#### 12.2 Access Monitoring

- Netdata: `http://your-ec2-ip:19999`
- Configure firewall to allow port 19999 if needed

---

## 🔒 Security Hardening

### 1. Update Security Group

**Remove port 3001** from security group (use Nginx only)

### 2. Setup Firewall (UFW)

```bash
# Enable firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Check status
sudo ufw status
```

### 3. Disable Root Login

```bash
sudo nano /etc/ssh/sshd_config
```

**Change:**
```
PermitRootLogin no
PasswordAuthentication no
```

**Restart SSH:**
```bash
sudo systemctl restart sshd
```

### 4. Setup Fail2Ban

```bash
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

---

## 📊 Monitoring & Maintenance

### Check Application Status

```bash
# Container status
docker ps

# Application logs
docker-compose logs -f app

# Database logs
docker-compose logs -f postgres

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# System resources
htop
```

### Restart Application

```bash
# Restart containers
docker-compose restart

# Rebuild and restart
docker-compose up -d --build

# Restart Nginx
sudo systemctl restart nginx
```

### Update Application

```bash
# Pull latest code
cd ~/leetcodepractice
git pull

# Rebuild containers
docker-compose down
docker-compose up -d --build
```

---

## 💰 Cost Estimation

### Monthly Costs (US East region)

| Resource | Type | Cost |
|----------|------|------|
| EC2 Instance | t2.micro (Free tier) | $0 (first year) |
| EC2 Instance | t2.small | ~$17/month |
| EBS Storage | 20 GB | ~$2/month |
| Data Transfer | First 100 GB | Free |
| **Total (Free tier)** | | **~$2/month** |
| **Total (Production)** | | **~$19/month** |

---

## 🚨 Troubleshooting

### Application Won't Start

```bash
# Check logs
docker-compose logs

# Check disk space
df -h

# Check memory
free -h

# Restart everything
docker-compose down
docker-compose up -d
```

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Check database logs
docker-compose logs postgres

# Connect to database
docker exec -it leetcode-postgres psql -U leetcodeuser -d leetcodepractice
```

### Nginx Issues

```bash
# Test configuration
sudo nginx -t

# Check status
sudo systemctl status nginx

# Restart
sudo systemctl restart nginx
```

### Out of Memory

```bash
# Check memory usage
free -h

# Add swap space
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 🎯 Access Your Application

After deployment:

- **HTTP:** `http://your-ec2-ip` or `http://your-domain.com`
- **HTTPS:** `https://your-domain.com` (after SSL setup)
- **API:** `https://your-domain.com/api/health`

---

## 📝 Next Steps

1. ✅ Setup domain name (Route 53 or external)
2. ✅ Configure SSL certificate
3. ✅ Setup automated backups to S3
4. ✅ Configure CloudWatch monitoring
5. ✅ Setup CI/CD pipeline (GitHub Actions)
6. ✅ Configure auto-scaling (if needed)

---

## 📚 Additional Resources

- [AWS EC2 Documentation](https://docs.aws.amazon.com/ec2/)
- [Docker Documentation](https://docs.docker.com/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt](https://letsencrypt.org/)

---

**Deployment completed! Your app is now live on AWS EC2! 🎉**
