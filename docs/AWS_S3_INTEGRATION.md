# AWS S3 Integration Guide

## 🎯 Tổng Quan

AWS S3 **KHÔNG THAY THẾ** PostgreSQL. Chúng hoạt động cùng nhau:

- **PostgreSQL:** Lưu trữ dữ liệu có cấu trúc (problems, solved status, etc.)
- **AWS S3:** Lưu trữ files (backups, images, documents)

## 🏗️ Kiến Trúc

```
┌─────────────────────────────────────────────────────────┐
│ Application                                             │
│                                                         │
│  ┌─────────────┐                  ┌─────────────┐     │
│  │ PostgreSQL  │ ←── Queries ───→ │  Node.js    │     │
│  │  Database   │                  │   Backend   │     │
│  └─────────────┘                  └──────┬──────┘     │
│                                           │            │
│                                           │ Upload     │
│                                           ↓            │
│                                    ┌─────────────┐     │
│                                    │   AWS S3    │     │
│                                    │   Bucket    │     │
│                                    └─────────────┘     │
└─────────────────────────────────────────────────────────┘
```

## 📦 Use Cases

### 1. Backup Database Lên S3 (Recommended)

**Lợi ích:**
- ✅ Bảo vệ dữ liệu khỏi mất máy local
- ✅ Disaster recovery
- ✅ Chia sẻ backup với team
- ✅ Tự động retention policy

**Setup:**

#### Bước 1: Cài AWS SDK

```bash
npm install @aws-sdk/client-s3
```

#### Bước 2: Cấu Hình AWS Credentials

**File:** `.env`
```env
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=leetcode-backups
```

#### Bước 3: Tạo Script Backup Lên S3

**File:** `server/scripts/backupToS3.js`

```javascript
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execAsync = promisify(exec);

async function backupToS3() {
  try {
    console.log('🔄 Starting backup to S3...');
    
    // 1. Create local backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup_${timestamp}.sql`;
    const localPath = path.join(__dirname, '../../backups', filename);
    
    console.log('💾 Creating local backup...');
    await execAsync(
      `docker exec leetcode-postgres pg_dump -U leetcodeuser leetcodepractice > ${localPath}`
    );
    
    // 2. Upload to S3
    console.log('☁️  Uploading to S3...');
    const s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });
    
    const fileContent = fs.readFileSync(localPath);
    
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: `backups/${filename}`,
      Body: fileContent,
      ContentType: 'application/sql',
      Metadata: {
        'backup-date': new Date().toISOString(),
        'database': 'leetcodepractice'
      }
    }));
    
    const fileSizeMB = (fs.statSync(localPath).size / 1024 / 1024).toFixed(2);
    
    console.log('✅ Backup uploaded to S3 successfully!');
    console.log(`📊 File: ${filename}`);
    console.log(`📏 Size: ${fileSizeMB} MB`);
    console.log(`🪣 Bucket: ${process.env.AWS_S3_BUCKET}`);
    console.log(`🔗 Key: backups/${filename}`);
    
    // Optional: Delete local backup after upload
    // fs.unlinkSync(localPath);
    
  } catch (error) {
    console.error('❌ Backup to S3 failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  backupToS3()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { backupToS3 };
```

#### Bước 4: Chạy Backup

```bash
node server/scripts/backupToS3.js
```

### 2. Restore Từ S3

**File:** `server/scripts/restoreFromS3.js`

```javascript
const { S3Client, GetObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execAsync = promisify(exec);

async function listS3Backups() {
  const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  });
  
  const response = await s3Client.send(new ListObjectsV2Command({
    Bucket: process.env.AWS_S3_BUCKET,
    Prefix: 'backups/'
  }));
  
  return response.Contents || [];
}

async function restoreFromS3(s3Key) {
  try {
    console.log('🔄 Starting restore from S3...');
    
    // 1. Download from S3
    console.log('☁️  Downloading from S3...');
    const s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });
    
    const response = await s3Client.send(new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: s3Key
    }));
    
    const filename = path.basename(s3Key);
    const localPath = path.join(__dirname, '../../backups', filename);
    
    // Convert stream to buffer
    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    const fileContent = Buffer.concat(chunks);
    
    fs.writeFileSync(localPath, fileContent);
    
    console.log('💾 Downloaded to:', localPath);
    
    // 2. Restore to database
    console.log('🔄 Restoring to database...');
    await execAsync(
      `docker exec -i leetcode-postgres psql -U leetcodeuser -d leetcodepractice < ${localPath}`
    );
    
    console.log('✅ Restore completed successfully!');
    
  } catch (error) {
    console.error('❌ Restore from S3 failed:', error);
    throw error;
  }
}

module.exports = { listS3Backups, restoreFromS3 };
```

### 3. Tự Động Backup Lên S3 Hàng Ngày

**File:** `scripts/backup-to-s3.ps1`

```powershell
# Backup to S3 Script
$ErrorActionPreference = "Stop"

Write-Host "🔄 Starting backup to S3..." -ForegroundColor Cyan

# Change to project directory
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$PROJECT_DIR = Split-Path -Parent $SCRIPT_DIR
Set-Location $PROJECT_DIR

# Run backup script
node server/scripts/backupToS3.js

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backup to S3 completed!" -ForegroundColor Green
} else {
    Write-Host "❌ Backup to S3 failed!" -ForegroundColor Red
    exit 1
}
```

**Setup Task Scheduler:**
- Giống như backup local
- Chạy `scripts/backup-to-s3.ps1` thay vì `scripts/backup.ps1`

## 🔐 Security Best Practices

### 1. Sử Dụng IAM User Riêng

Tạo IAM user chỉ có quyền S3:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:ListBucket",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::leetcode-backups",
        "arn:aws:s3:::leetcode-backups/*"
      ]
    }
  ]
}
```

### 2. Encrypt Backups

```javascript
await s3Client.send(new PutObjectCommand({
  Bucket: process.env.AWS_S3_BUCKET,
  Key: `backups/${filename}`,
  Body: fileContent,
  ServerSideEncryption: 'AES256' // ← Encrypt at rest
}));
```

### 3. Lifecycle Policy

Tự động xóa backup cũ sau 30 ngày:

```json
{
  "Rules": [
    {
      "Id": "DeleteOldBackups",
      "Status": "Enabled",
      "Prefix": "backups/",
      "Expiration": {
        "Days": 30
      }
    }
  ]
}
```

## 💰 Chi Phí

### S3 Pricing (us-east-1)

- **Storage:** $0.023/GB/month
- **PUT requests:** $0.005/1000 requests
- **GET requests:** $0.0004/1000 requests

**Ví dụ:**
- Backup size: 2 MB
- Backup frequency: Daily (30 backups/month)
- Total storage: 60 MB = 0.06 GB

**Chi phí/tháng:**
- Storage: 0.06 GB × $0.023 = $0.00138
- PUT: 30 × $0.005/1000 = $0.00015
- **Total: ~$0.002/month** (gần như miễn phí!)

## 🎯 Kết Luận

### PostgreSQL vs S3

| Feature | PostgreSQL | AWS S3 |
|---------|-----------|--------|
| **Mục đích** | Structured data | Files/Objects |
| **Dùng cho** | Problems, users, reviews | Backups, images, docs |
| **Query** | SQL | HTTP API |
| **Cost** | Fixed (container) | Pay per use |
| **Backup** | pg_dump | Upload files |

### Recommendation

**Cho project của bạn:**

1. ✅ **Giữ PostgreSQL** - Cho database chính
2. ✅ **Thêm S3** - Cho backup tự động lên cloud
3. ✅ **Dual backup** - Local (nhanh) + S3 (an toàn)

**Setup đề xuất:**
```
Daily backup:
├─ Local backup (scripts/backup.ps1)
└─ S3 backup (scripts/backup-to-s3.ps1)

Retention:
├─ Local: 10 backups gần nhất
└─ S3: 30 ngày (lifecycle policy)
```

## 📚 Tài Liệu Tham Khảo

- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
- [S3 Pricing](https://aws.amazon.com/s3/pricing/)
