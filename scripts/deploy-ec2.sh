#!/bin/bash
# EC2 Deployment Script for LeetCode Practice App
# Run this script on your EC2 instance after initial setup

set -e  # Exit on error

echo "🚀 Starting LeetCode Practice App Deployment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if running as ubuntu user
if [ "$USER" != "ubuntu" ]; then
    print_error "This script should be run as ubuntu user"
    exit 1
fi

# Update system
print_warning "Updating system packages..."
sudo apt update
sudo apt upgrade -y
print_success "System updated"

# Install Docker
if ! command -v docker &> /dev/null; then
    print_warning "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker ubuntu
    rm get-docker.sh
    print_success "Docker installed"
else
    print_success "Docker already installed"
fi

# Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
    print_warning "Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    print_success "Docker Compose installed"
else
    print_success "Docker Compose already installed"
fi

# Install Nginx
if ! command -v nginx &> /dev/null; then
    print_warning "Installing Nginx..."
    sudo apt install nginx -y
    print_success "Nginx installed"
else
    print_success "Nginx already installed"
fi

# Install other utilities
print_warning "Installing utilities..."
sudo apt install -y htop curl wget git
print_success "Utilities installed"

# Create directories
print_warning "Creating directories..."
mkdir -p ~/backups
mkdir -p ~/logs
print_success "Directories created"

# Check if .env exists
if [ ! -f .env ]; then
    print_warning ".env file not found. Creating template..."
    cat > .env << 'EOF'
# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_NAME=leetcodepractice
DB_USER=leetcodeuser
DB_PASSWORD=CHANGE_THIS_PASSWORD

# Application Configuration
PORT=3001
NODE_ENV=production

# Optional: AWS S3
# AWS_ACCESS_KEY_ID=your_key
# AWS_SECRET_ACCESS_KEY=your_secret
# AWS_REGION=us-east-1
# AWS_S3_BUCKET=leetcode-backups
EOF
    print_warning "Please edit .env file with your configuration"
    print_warning "Run: nano .env"
else
    print_success ".env file exists"
fi

# Start Docker containers
print_warning "Starting Docker containers..."
docker-compose up -d
print_success "Containers started"

# Wait for containers to be healthy
print_warning "Waiting for containers to be healthy..."
sleep 10

# Check container status
if docker ps | grep -q "leetcode-app"; then
    print_success "App container is running"
else
    print_error "App container failed to start"
    docker-compose logs app
    exit 1
fi

if docker ps | grep -q "leetcode-postgres"; then
    print_success "PostgreSQL container is running"
else
    print_error "PostgreSQL container failed to start"
    docker-compose logs postgres
    exit 1
fi

# Test application
print_warning "Testing application..."
sleep 5
if curl -s http://localhost:3001/api/health | grep -q "ok"; then
    print_success "Application is responding"
else
    print_warning "Application may not be ready yet. Check logs with: docker-compose logs -f"
fi

# Setup Nginx configuration
print_warning "Setting up Nginx..."
sudo tee /etc/nginx/sites-available/leetcode-practice > /dev/null << 'EOF'
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
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/leetcode-practice /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
if sudo nginx -t; then
    print_success "Nginx configuration is valid"
    sudo systemctl restart nginx
    sudo systemctl enable nginx
    print_success "Nginx restarted"
else
    print_error "Nginx configuration is invalid"
    exit 1
fi

# Setup backup script
print_warning "Setting up backup script..."
cat > ~/backup-db.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/ubuntu/backups"
mkdir -p $BACKUP_DIR

docker exec leetcode-postgres pg_dump -U leetcodeuser leetcodepractice > $BACKUP_DIR/backup_$DATE.sql

# Keep only last 7 days
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete

echo "Backup completed: backup_$DATE.sql"
EOF

chmod +x ~/backup-db.sh
print_success "Backup script created"

# Setup cron job for backups
if ! crontab -l 2>/dev/null | grep -q "backup-db.sh"; then
    print_warning "Setting up daily backup cron job..."
    (crontab -l 2>/dev/null; echo "0 2 * * * /home/ubuntu/backup-db.sh >> /home/ubuntu/logs/backup.log 2>&1") | crontab -
    print_success "Backup cron job added (runs daily at 2 AM)"
else
    print_success "Backup cron job already exists"
fi

# Setup firewall
print_warning "Configuring firewall..."
sudo ufw --force enable
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
print_success "Firewall configured"

# Print summary
echo ""
echo "=========================================="
echo "🎉 Deployment Complete!"
echo "=========================================="
echo ""
print_success "Application is running at:"
echo "  - Local: http://localhost:3001"
echo "  - Public: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
echo ""
print_success "Next steps:"
echo "  1. Import data: docker exec -it leetcode-app node server/scripts/importProblems.js"
echo "  2. Check logs: docker-compose logs -f"
echo "  3. Setup SSL: sudo certbot --nginx -d your-domain.com"
echo "  4. Configure domain in Nginx: sudo nano /etc/nginx/sites-available/leetcode-practice"
echo ""
print_warning "Important:"
echo "  - Edit .env file with secure passwords"
echo "  - Configure your domain name"
echo "  - Setup SSL certificate for HTTPS"
echo "  - Review security group settings"
echo ""
print_success "Useful commands:"
echo "  - View logs: docker-compose logs -f"
echo "  - Restart app: docker-compose restart"
echo "  - Backup now: ~/backup-db.sh"
echo "  - Check status: docker ps"
echo ""
