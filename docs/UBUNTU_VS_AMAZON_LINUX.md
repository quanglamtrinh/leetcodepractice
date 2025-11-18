# Ubuntu vs Amazon Linux - Quick Comparison

Chọn AMI nào cho EC2 instance của bạn?

---

## 🎯 Quick Answer

**Dùng Ubuntu nếu:**
- ✅ Bạn quen với Ubuntu/Debian
- ✅ Muốn nhiều tutorials/resources
- ✅ Cần package mới nhất

**Dùng Amazon Linux nếu:**
- ✅ Muốn tích hợp tốt với AWS services
- ✅ Ưu tiên performance và security
- ✅ Muốn support từ AWS

---

## 📊 Comparison Table

| Feature | Ubuntu 22.04 LTS | Amazon Linux 2023 |
|---------|------------------|-------------------|
| **Package Manager** | `apt` | `yum` |
| **Default User** | `ubuntu` | `ec2-user` |
| **Support** | Community + Canonical | AWS Official |
| **Updates** | 5 years LTS | Rolling updates |
| **AWS Integration** | Good | Excellent |
| **Community** | Very Large | Medium |
| **Learning Curve** | Easy | Easy-Medium |
| **Cost** | Same | Same |

---

## 🔧 Command Differences

### Package Management

| Task | Ubuntu | Amazon Linux |
|------|--------|--------------|
| Update | `sudo apt update` | `sudo yum update` |
| Install | `sudo apt install package` | `sudo yum install package` |
| Remove | `sudo apt remove package` | `sudo yum remove package` |
| Search | `apt search package` | `yum search package` |

### System User

| OS | Default User | Home Directory |
|----|--------------|----------------|
| Ubuntu | `ubuntu` | `/home/ubuntu` |
| Amazon Linux | `ec2-user` | `/home/ec2-user` |

### Nginx Configuration

| OS | Config Location |
|----|-----------------|
| Ubuntu | `/etc/nginx/sites-available/` |
| Amazon Linux | `/etc/nginx/conf.d/` |

### Firewall

| OS | Firewall | Commands |
|----|----------|----------|
| Ubuntu | `ufw` | `sudo ufw allow 80` |
| Amazon Linux | `firewalld` | `sudo firewall-cmd --add-service=http` |

---

## 🚀 Deployment Scripts

### Ubuntu

```bash
# Connect
ssh -i key.pem ubuntu@YOUR_IP

# Deploy
git clone YOUR_REPO
cd leetcodepractice
chmod +x scripts/deploy-ec2.sh
./scripts/deploy-ec2.sh
```

### Amazon Linux

```bash
# Connect
ssh -i key.pem ec2-user@YOUR_IP

# Deploy
git clone YOUR_REPO
cd leetcodepractice
chmod +x scripts/deploy-ec2-amazon-linux.sh
./scripts/deploy-ec2-amazon-linux.sh

# Logout and login again
exit
ssh -i key.pem ec2-user@YOUR_IP
```

---

## 💡 Recommendations

### Choose Ubuntu If:

1. **You're learning** - More tutorials available
2. **You use Ubuntu locally** - Familiar environment
3. **You need latest packages** - Newer versions
4. **Community support** - Larger community

### Choose Amazon Linux If:

1. **AWS-first approach** - Better AWS integration
2. **Performance matters** - Optimized for AWS
3. **Security focus** - AWS security updates
4. **AWS support** - Official AWS support

---

## 🎯 For This Project

**Both work perfectly!** Choose based on your preference:

- **Ubuntu:** More familiar, easier to find help
- **Amazon Linux:** Better AWS integration, slightly faster

**Our recommendation:** Start with **Ubuntu** if you're unsure.

---

## 📚 Documentation

- **Ubuntu Guide:** [docs/AWS_EC2_DEPLOYMENT.md](AWS_EC2_DEPLOYMENT.md)
- **Amazon Linux Guide:** [docs/AWS_EC2_AMAZON_LINUX.md](AWS_EC2_AMAZON_LINUX.md)
- **Quick Start:** [EC2_QUICK_START.md](../EC2_QUICK_START.md)

---

**Both options are production-ready! Pick what you're comfortable with. 🚀**
