# Deploy Frontend to S3
# Usage: .\scripts\deploy-s3.ps1

param(
    [string]$BucketName = "leetcode-practice-frontend",
    [string]$Region = "us-east-2"
)

Write-Host "🚀 Building and deploying frontend to S3..." -ForegroundColor Cyan

# Check if AWS CLI is installed
try {
    aws --version | Out-Null
} catch {
    Write-Host "❌ AWS CLI not found. Please install it first." -ForegroundColor Red
    Write-Host "Download from: https://aws.amazon.com/cli/" -ForegroundColor Yellow
    exit 1
}

# Navigate to client directory
Set-Location client

Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install

Write-Host "🔨 Building production bundle..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Write-Host "📤 Uploading to S3..." -ForegroundColor Yellow
aws s3 sync build/ s3://$BucketName/ --region $Region --delete

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Upload failed" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Write-Host "🔄 Invalidating CloudFront cache (if exists)..." -ForegroundColor Yellow
# Get CloudFront distribution ID for this bucket
$distributions = aws cloudfront list-distributions --query "DistributionList.Items[?Origins.Items[?DomainName=='$BucketName.s3.amazonaws.com']].Id" --output text --region $Region 2>$null

if ($distributions) {
    foreach ($distId in $distributions -split "`t") {
        Write-Host "  Invalidating distribution: $distId" -ForegroundColor Gray
        aws cloudfront create-invalidation --distribution-id $distId --paths "/*" --region $Region | Out-Null
    }
} else {
    Write-Host "  No CloudFront distribution found (skipping)" -ForegroundColor Gray
}

Set-Location ..

Write-Host ""
Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Website URL:" -ForegroundColor Cyan
Write-Host "  http://$BucketName.s3-website-$Region.amazonaws.com" -ForegroundColor White
Write-Host ""
Write-Host "📝 To verify:" -ForegroundColor Cyan
Write-Host "  aws s3 ls s3://$BucketName/ --region $Region" -ForegroundColor White
