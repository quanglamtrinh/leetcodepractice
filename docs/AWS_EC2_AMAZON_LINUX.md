# AWS EC2 Deployment - Amazon Linux 2023

Hướng dẫn deploy cho Amazon Linux 2023 (dùng `yum` thay vì `apt`).

---

## 🎯 Khác Biệt Chính

| Ubuntu | Amazon Linux |
|--------|--------------|
| User: `ubuntu` | User: `ec2-user` |
| Package manager: `apt` | Package manager: `yum` |
| `sudo apt install` | `sudo yum install` |
| `/etc/nginx/sites-available/` | `/etc/nginx/conf.d/` |

---

## 🚀 Quick Start

### 1. Launch EC2 Instance

**AWS Console → EC2 → Launch Instance:**

```
Name: leetcode-practice-app
AMI: Amazon Linux 2023 AMI
Instance Type: t2.small (hoặc t2.micro cho free tier)
Key Pair: Tạo mới → Download .pem file
Security Group: Allow SSH (22), HTTP (80), HTTPS (443)
Storage: 20 GB
```

---

### 2. Connect to EC2

```bash
# Windows PowerShell
ssh -i "your-key.pem" ec2-user@YOUR_EC2_IP

# Mac/Linux
chmod 400 your-key.pem
ssh -i your-key.pem ec2-user@YOUR_EC2_IP
```

**Lưu ý:** User là `ec2-user` chứ không phải `ubuntu`

---

### 3. Run Automated Setup

```bash
# Clone project
git clone https://github.com/YOUR_USERNAME/leetcodepractice.git
cd leetcodepractice

# Run Amazon Linux deployment script
chmod +x scripts/deploy-ec2-amazon-linux.sh
./scripts/deploy-ec2-amazon-linux.sh
```

---

### 4. Logout và Login Lại

```bash
# Logout để Docker group có hiệu lực
exit

# Login lại
ssh -i "your-key.pem" ec2-user@YOUR_EC2_IP
cd leetcodepractice
```

---

### 5. Configure Environment

```bash
nano .env
```

**Thay đổi:**
```env
DB_PASSWORD=YOUR_SECURE_PASSWORD
NODE_ENV=production
```

**Restart:**
```bash
docker-compose restart
```

---

### 6. Import Data

```bash
docker exec -it leetcode-app node server/scripts/importProblems.js
```

---

## 📝 Manual Installation (Nếu Script Không Chạy)

### Install Docker

```bash
# Update system
sudo yum update -y

# Install Docker
sudo yum install docker -y

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group
sudo usermod -aG docker ec2-user

# Logout and login again
exit
```

### Install Docker Composee

```bash
# Download Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Make executable
sudo chmod +x /usr/local/bin/docker-compose

# Verify
docker-compose --version
```

### Install Nginx

```bash
# Install Nginx
sudo amazon-linux-extras install nginx1 -y

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Check status
sudo systemctl status nginx
```

### Install Other Tools

```bash
sudo yum install -y git htop
```

---

## 🔧 Nginx Configuration

### Create Configuration File

```bash
sudo nano /etc/nginx/conf.d/leetcode-practice.conf
```

**Add:**

```nginx
server {
    listen 80;
    server_name _;

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
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /api/health {
        proxy_pass http://localhost:3001/api/health;
        access_log off;
    }
}
```

### Test and Restart

```bash
# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

---

## 🔒 Setup SSL Certificate

### Install Certbot

```bash
# Install EPEL repository
sudo yum install -y https://dl.fedoraproject.org/pub/epel/epel-release-latest-9.noarch.rpm

# Install Certbot
sudo yum install certbot python3-certbot-nginx -y
```

### Get Certificate

```bash
# Replace with your domain
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Follow prompts
```

### Auto-Renewal

```bash
# Test renewal
sudo certbot renew --dry-run

# Certbot tự động setup cron job
```

---

## 💾 Backup Setup

### Create Backup Script

```bash
nano ~/backup-db.sh
```

**Add:**

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/ec2-user/backups"
mkdir -p $BACKUP_DIR

docker exec leetcode-postgres pg_dump -U leetcodeuser leetcodepractice > $BACKUP_DIR/backup_$DATE.sql

# Keep only last 7 days
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete

echo "Backup completed: backup_$DATE.sql"
```

**Make executable:**

```bash
chmod +x ~/backup-db.sh
```

### Setup Cron Job

```bash
crontab -e
```

**Add:**

```cron
0 2 * * * /home/ec2-user/backup-db.sh >> /home/ec2-user/logs/backup.log 2>&1
```

---

## 🔥 Firewall Configuration

Amazon Linux sử dụng `firewalld`:

```bash
# Start firewalld
sudo systemctl start firewalld
sudo systemctl enable firewalld

# Allow HTTP and HTTPS
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https

# Reload firewall
sudo firewall-cmd --reload

# Check status
sudo firewall-cmd --list-all
```

---

## 📊 Useful Commands

### System Management

```bash
# Update system
sudo yum update -y

# Check system info
cat /etc/os-release

# Check memory
free -h

# Check disk space
df -h

# Monitor system
htop
```

### Docker Management

```bash
# Check Docker status
sudo systemctl status docker

# Start Docker
sudo systemctl start docker

# View containers
docker ps

# View logs
docker-compose logs -f

# Restart containers
docker-compose restart
```

### Nginx Management

```bash
# Check Nginx status
sudo systemctl status nginx

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# View logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## 🆘 Troubleshooting

### Docker Permission Denied

```bash
# Add user to docker group
sudo usermod -aG docker ec2-user

# Logout and login again
exit
ssh -i "your-key.pem" ec2-user@YOUR_EC2_IP
```

### Nginx Won't Start

```bash
# Check if port 80 is in use
sudo netstat -tulpn | grep :80

# Check SELinux status
getenforce

# If SELinux is enforcing, allow Nginx
sudo setsebool -P httpd_can_network_connect 1
```

### Docker Compose Not Found

```bash
# Check installation
ls -l /usr/local/bin/docker-compose

# If not found, reinstall
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### Application Not Responding

```bash
# Check containers
docker ps

# Check logs
docker-compose logs app
docker-compose logs postgres

# Restart
docker-compose restart
```

---

## 🔄 Update Application

```bash
# Pull latest code
cd ~/leetcodepractice
git pull

# Rebuild and restart
docker-compose down
docker-compose up -d --build

# Check status
docker ps
docker-compose logs -f
```

---

## 📝 Differences from Ubuntu

| Task | Ubuntu | Amazon Linux |
|------|--------|--------------|
| **User** | ubuntu | ec2-user |
| **Update** | `sudo apt update` | `sudo yum update` |
| **Install** | `sudo apt install` | `sudo yum install` |
| **Nginx config** | `/etc/nginx/sites-available/` | `/etc/nginx/conf.d/` |
| **Firewall** | `ufw` | `firewalld` |
| **Home dir** | `/home/ubuntu` | `/home/ec2-user` |

---

## 💰 Cost

Same as Ubuntu:
- **Free tier:** ~$2/month (first year)
- **Production:** ~$19/month (t2.small)

---

## 📚 Additional Resources

- [Amazon Linux 2023 Documentation](https://docs.aws.amazon.com/linux/)
- [Docker on Amazon Linux](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/docker-basics.html)
- [Nginx Documentation](https://nginx.org/en/docs/)

---

**Deployment hoàn tất! App của bạn đã live trên Amazon Linux! 🎉**

Access tại: `http://YOUR_EC2_IP`
