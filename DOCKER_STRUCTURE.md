# Docker Structure Overview

## 📁 File Organization

```
leetcodepractice/
├── docker-compose.yml              # Development - orchestrates all services
├── Dockerfile                      # Legacy - can be removed
├── Dockerfile.dev                  # Legacy - can be removed
│
├── server/
│   ├── Dockerfile                  # ✅ Backend production image
│   ├── .dockerignore              # ✅ Backend docker ignore
│   ├── docker-compose.prod.yml    # ✅ Production deployment
│   ├── deploy-ec2.sh              # ✅ EC2 deployment script
│   ├── DEPLOYMENT.md              # ✅ Deployment guide
│   └── .env.example               # ✅ Environment template
│
└── client/
    └── (frontend files)
```

## 🎯 Usage

### Development (Local)
```bash
# From project root
docker-compose up -d

# View logs
docker-compose logs -f
```

### Production (EC2)
```bash
# From server folder
cd server
./deploy-ec2.sh

# Or manually
docker-compose -f docker-compose.prod.yml up -d
```

## 🔄 Migration Path

### Old Structure (Before)
```
Root Dockerfile → Builds everything (client + server)
Root docker-compose.yml → Runs monolithic app
```

### New Structure (After)
```
server/Dockerfile → Builds backend only
server/docker-compose.prod.yml → Production backend + DB
Root docker-compose.yml → Development (updated to use server/Dockerfile)
```

## ✅ Benefits

1. **Separation of Concerns**: Backend có Dockerfile riêng
2. **Faster Builds**: Chỉ rebuild service thay đổi
3. **EC2 Ready**: Deploy backend độc lập
4. **Scalable**: Dễ thêm services mới (Redis, Nginx, etc.)
5. **Clear Structure**: Mỗi service tự quản lý Docker config

## 🚀 Next Steps

1. Test local development: `docker-compose up`
2. Test production build: `cd server && docker-compose -f docker-compose.prod.yml up`
3. Deploy to EC2: Follow `server/DEPLOYMENT.md`
4. (Optional) Add `client/Dockerfile` for frontend deployment

## 🗑️ Cleanup Old Files

After testing, you can remove:
- `Dockerfile` (root)
- `Dockerfile.dev` (root)

Keep:
- `docker-compose.yml` (root - for development)
- `server/Dockerfile` (for production)
- `server/docker-compose.prod.yml` (for EC2)
