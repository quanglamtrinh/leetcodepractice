# 🚀 EC2 Quick Start Guide

Deploy your LeetCode Practice App to AWS EC2 in 15 minutes.

---

## ⚡ Super Quick Deployment

### 1. Launch EC2 Instance (5 minutes)

**AWS Console → EC2 → Launch Instance:**

```
Name: leetcode-practice-app
AMI: Choose one:
  - Ubuntu Server 22.04 LTS (recommended)
  - Amazon Linux 2023 AMI
Instance Type: t2.small (or t2.micro for free tier)
Key Pair: Create new → Download .pem file
Security Group: Allow SSH (22), HTTP (80), HTTPS (443)
Storage: 20 GB
```

Click **Launch Instance**

---

### 2. Connect to EC2 (2 minutes)

**Get your instance IP from AWS Console**

**For Ubuntu:**
```bash
ssh -i "your-key.pem" ubuntu@YOUR_EC2_IP
```

**For Amazon Linux:**
```bash
ssh -i "your-key.pem" ec2-user@YOUR_EC2_IP
```

**Windows:** Same commands in PowerShell

---

### 3. Run Automated Setup (5 minutes)

```bash
# Clone your project
git clone https://github.com/YOUR_USERNAME/leetcodepractice.git
cd leetcodepractice

# Run deployment script
# For Ubuntu:
chmod +x scripts/deploy-ec2.sh
./scripts/deploy-ec2.sh

# For Amazon Linux:
chmod +x scripts/deploy-ec2-amazon-linux.sh
./scripts/deploy-ec2-amazon-linux.sh
```

**The script will:**
- ✅ Install Docker & Docker Compose
- ✅ Install Nginx
- ✅ Setup firewall
- ✅ Start your application
- ✅ Configure reverse proxy
- ✅ Setup automatic backups

**For Amazon Linux:** Logout and login again after script completes

---

### 4. Configure Environment (2 minutes)

```bash
# Edit .env file
nano .env
```

**Change these values:**
```env
DB_PASSWORD=YOUR_SECURE_PASSWORD_HERE
NODE_ENV=production
```

**Save:** `Ctrl+X` → `Y` → `Enter`

**Restart:**
```bash
docker-compose restart
```

---

### 5. Import Data (1 minute)

```bash
docker exec -it leetcode-app node server/scripts/importProblems.js
```

---

## ✅ Done! Access Your App

**Your app is now live at:**
```
http://YOUR_EC2_IP
```

---

## 🔒 Optional: Setup HTTPS (5 minutes)

### If you have a domain:

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Follow prompts and choose redirect HTTP to HTTPS
```

**Your app is now at:**
```
https://your-domain.com
```

---

## 📊 Useful Commands

```bash
# Check status
docker ps

# View logs
docker-compose logs -f

# Restart app
docker-compose restart

# Backup database
~/backup-db.sh

# Update app
git pull
docker-compose up -d --build

# Check system resources
htop
```

---

## 🆘 Troubleshooting

### App not responding?

```bash
# Check logs
docker-compose logs app

# Restart
docker-compose restart
```

### Database issues?

```bash
# Check PostgreSQL
docker-compose logs postgres

# Connect to database
docker exec -it leetcode-postgres psql -U leetcodeuser -d leetcodepractice
```

### Nginx issues?

```bash
# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

---

## 💰 Cost

**Free Tier (First Year):**
- t2.micro instance: $0
- 20 GB storage: ~$2/month
- **Total: ~$2/month**

**After Free Tier:**
- t2.small instance: ~$17/month
- 20 GB storage: ~$2/month
- **Total: ~$19/month**

---

## 📚 Full Documentation

For detailed instructions, see:
- [AWS EC2 Deployment (Ubuntu)](docs/AWS_EC2_DEPLOYMENT.md)
- [AWS EC2 Deployment (Amazon Linux)](docs/AWS_EC2_AMAZON_LINUX.md)
- [Docker Commands](DOCKER_COMMANDS.md)
- [Backup Guide](docs/BACKUP_RESTORE_GUIDE.md)

---

## 🎯 Next Steps

1. ✅ Configure domain name
2. ✅ Setup SSL certificate
3. ✅ Configure automated backups to S3
4. ✅ Setup monitoring (CloudWatch)
5. ✅ Configure CI/CD pipeline

---

**Your app is live! 🎉**

Access it at: `http://YOUR_EC2_IP`
