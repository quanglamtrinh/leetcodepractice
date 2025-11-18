# Frontend Deployment to S3 + CloudFront

Hướng dẫn deploy React frontend lên AWS S3 với CloudFront CDN.

## 📋 Prerequisites

- AWS Account
- AWS CLI installed và configured
- Node.js & npm installed
- Backend đã deploy trên EC2

---

## 🚀 Bước 1: Configure AWS CLI

```bash
# Install AWS CLI (nếu chưa có)
# Windows: https://aws.amazon.com/cli/
# Mac: brew install awscli
# Linux: sudo yum install aws-cli -y

# Configure credentials
aws configure

# Nhập:
# AWS Access Key ID: [Your Access Key]
# AWS Secret Access Key: [Your Secret Key]
# Default region name: us-east-1
# Default output format: json

# Test
aws s3 ls
```

---

## 🏗️ Bước 2: Build Frontend

```bash
# Vào folder client
cd client

# Tạo .env.production với backend URL
cat > .env.production << 'EOF'
REACT_APP_API_URL=http://3.131.128.224:3001
EOF

# Build production
npm run build

# Kết quả: folder build/ với static files
ls -la build/
```

---

## 📦 Bước 3: Create S3 Bucket

```bash
# Tạo bucket với tên unique
# Format: leetcode-practice-frontend-[timestamp]
BUCKET_NAME="leetcode-practice-frontend-$(date +%s)"
echo "Bucket name: $BUCKET_NAME"

# Create bucket
aws s3 mb s3://$BUCKET_NAME --region us-east-1

# Enable static website hosting
aws s3 website s3://$BUCKET_NAME \
  --index-document index.html \
  --error-document index.html

# Disable block public access
aws s3api put-public-access-block \
  --bucket $BUCKET_NAME \
  --public-access-block-configuration \
  "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"
```

---

## 🔓 Bước 4: Set Bucket Policy (Public Read)

```bash
# Create bucket policy file
cat > bucket-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
    }
  ]
}
EOF

# Apply policy
aws s3api put-bucket-policy \
  --bucket $BUCKET_NAME \
  --policy file://bucket-policy.json

echo "✅ Bucket policy applied"
```

---

## 📤 Bước 5: Upload Frontend Files

```bash
# Upload all files
aws s3 sync build/ s3://$BUCKET_NAME/ \
  --delete \
  --cache-control "public, max-age=31536000"

# Upload index.html with no-cache (để update nhanh)
aws s3 cp build/index.html s3://$BUCKET_NAME/index.html \
  --cache-control "no-cache, no-store, must-revalidate" \
  --content-type "text/html"

echo "✅ Files uploaded to S3"
```

---

## 🌐 Bước 6: Get S3 Website URL

```bash
# Get website endpoint
S3_URL="http://$BUCKET_NAME.s3-website-us-east-1.amazonaws.com"
echo ""
echo "🎉 Frontend deployed!"
echo "📍 S3 URL: $S3_URL"
echo ""
echo "Test it: curl $S3_URL"
```

**Truy cập URL này trong browser để test!**

---

## ⚡ Bước 7: Setup CloudFront (CDN)

### Option A: AWS Console (Dễ hơn)

1. Vào **AWS Console** → **CloudFront**
2. Click **Create Distribution**
3. **Origin Settings:**
   - Origin Domain: Chọn S3 bucket của bạn
   - Origin Path: để trống
   - Name: auto-generated
4. **Default Cache Behavior:**
   - Viewer Protocol Policy: **Redirect HTTP to HTTPS**
   - Allowed HTTP Methods: **GET, HEAD**
   - Cache Policy: **CachingOptimized**
5. **Settings:**
   - Price Class: **Use Only North America and Europe** (rẻ hơn)
   - Alternate Domain Names: để trống (hoặc thêm custom domain)
   - Default Root Object: **index.html**
6. Click **Create Distribution**
7. Đợi 10-15 phút để deploy

### Option B: AWS CLI

```bash
# Create CloudFront distribution
aws cloudfront create-distribution \
  --origin-domain-name $BUCKET_NAME.s3.amazonaws.com \
  --default-root-object index.html \
  --query 'Distribution.DomainName' \
  --output text

# Lưu CloudFront domain name
# Format: d1234567890abc.cloudfront.net
```

---

## 🔍 Bước 8: Test CloudFront

```bash
# Get CloudFront URL (từ AWS Console hoặc CLI output)
CLOUDFRONT_URL="https://d1234567890abc.cloudfront.net"

# Test
curl -I $CLOUDFRONT_URL

# Truy cập trong browser
echo "🌐 CloudFront URL: $CLOUDFRONT_URL"
```

---

## 🔧 Bước 9: Configure CORS trên Backend

Backend cần cho phép CloudFront domain:

```bash
# SSH vào EC2
ssh -i your-key.pem ec2-user@3.131.128.224

# Edit .env
cd ~/leetcodepractice/server
nano .env

# Thêm CloudFront URL vào ALLOWED_ORIGINS
# ALLOWED_ORIGINS=https://d1234567890abc.cloudfront.net,http://localhost:3000

# Restart backend
docker restart leetcode-backend-prod

# Exit EC2
exit
```

---

## 🔄 Bước 10: Create Deploy Script

Tạo script để deploy nhanh sau này:

```bash
# Create deploy script
cat > deploy-s3.sh << 'EOF'
#!/bin/bash
set -e

echo "🚀 Deploying Frontend to S3..."

# Config
BUCKET_NAME="your-bucket-name-here"  # CHANGE THIS
CLOUDFRONT_ID="your-distribution-id"  # CHANGE THIS (optional)

# Build
echo "📦 Building..."
npm run build

# Upload to S3
echo "📤 Uploading to S3..."
aws s3 sync build/ s3://$BUCKET_NAME/ \
  --delete \
  --cache-control "public, max-age=31536000"

# Upload index.html with no-cache
aws s3 cp build/index.html s3://$BUCKET_NAME/index.html \
  --cache-control "no-cache, no-store, must-revalidate" \
  --content-type "text/html"

# Invalidate CloudFront cache (optional)
if [ ! -z "$CLOUDFRONT_ID" ]; then
  echo "🔄 Invalidating CloudFront cache..."
  aws cloudfront create-invalidation \
    --distribution-id $CLOUDFRONT_ID \
    --paths "/*"
fi

echo ""
echo "✅ Deployment completed!"
echo "🌐 S3 URL: http://$BUCKET_NAME.s3-website-us-east-1.amazonaws.com"
if [ ! -z "$CLOUDFRONT_ID" ]; then
  echo "⚡ CloudFront URL: Check AWS Console"
fi
EOF

# Make executable
chmod +x deploy-s3.sh

# Edit bucket name
nano deploy-s3.sh
```

---

## 📝 Bước 11: Update Deploy Script với Bucket Name

```bash
# Edit deploy script
nano deploy-s3.sh

# Thay đổi:
# BUCKET_NAME="your-bucket-name-here"
# Thành:
# BUCKET_NAME="leetcode-practice-frontend-1234567890"

# Save và exit (Ctrl+X, Y, Enter)
```

---

## 🎯 Bước 12: Test End-to-End

1. **Truy cập CloudFront URL** trong browser
2. **Test các chức năng:**
   - Load danh sách problems
   - Xem chi tiết problem
   - Lưu notes
   - Calendar features
3. **Check browser console** xem có lỗi CORS không

---

## 🔄 Update Frontend (Sau này)

```bash
# Khi có code mới
cd client

# Pull latest code
git pull

# Deploy
./deploy-s3.sh
```

---

## 💰 Chi phí ước tính

- **S3 Storage**: $0.023/GB/month (~$0.50 cho 20GB)
- **S3 Requests**: $0.0004/1000 requests (~$0.10 cho 250k requests)
- **CloudFront**: $0.085/GB transfer (~$1-2 cho 20GB)
- **Total**: ~$1.50-2.50/month

---

## 🐛 Troubleshooting

### Frontend không load được

```bash
# Check S3 bucket policy
aws s3api get-bucket-policy --bucket $BUCKET_NAME

# Check files uploaded
aws s3 ls s3://$BUCKET_NAME/

# Check website configuration
aws s3api get-bucket-website --bucket $BUCKET_NAME
```

### CORS errors

```bash
# Check backend CORS config
# SSH vào EC2
ssh -i your-key.pem ec2-user@3.131.128.224
cd ~/leetcodepractice/server
cat .env | grep ALLOWED_ORIGINS

# Restart backend
docker restart leetcode-backend-prod
```

### CloudFront shows old content

```bash
# Invalidate cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

---

## 📊 Monitoring

### Check S3 metrics
```bash
# Get bucket size
aws s3 ls s3://$BUCKET_NAME --recursive --summarize

# Check access logs (if enabled)
aws s3 ls s3://$BUCKET_NAME-logs/
```

### Check CloudFront metrics
- AWS Console → CloudFront → Your Distribution → Monitoring

---

## 🎉 Success Checklist

- [ ] S3 bucket created
- [ ] Files uploaded
- [ ] S3 website accessible
- [ ] CloudFront distribution created
- [ ] CloudFront URL works with HTTPS
- [ ] Backend CORS configured
- [ ] End-to-end test passed
- [ ] Deploy script created

---

## 📞 Next Steps

1. **Custom Domain** (optional): Route 53 + SSL certificate
2. **CI/CD**: GitHub Actions auto deploy
3. **Monitoring**: CloudWatch alarms
4. **Backup**: S3 versioning enabled

---

**Deployment completed! 🚀**

Frontend: CloudFront URL
Backend: http://3.131.128.224:3001
