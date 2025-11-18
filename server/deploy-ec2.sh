#!/bin/bash

# EC2 Deployment Script for Backend
# Usage: ./deploy-ec2.sh

set -e

echo "🚀 Starting EC2 Backend Deployment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="leetcode-backend"
DOCKER_IMAGE="leetcode-backend:latest"

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ Error: .env file not found${NC}"
    echo "Please create .env file with required variables:"
    echo "  DB_NAME, DB_USER, DB_PASSWORD"
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

echo -e "${YELLOW}📦 Building Docker image...${NC}"
docker build -t $DOCKER_IMAGE .

echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
docker-compose -f docker-compose.prod.yml down

echo -e "${YELLOW}🗑️  Cleaning up old images...${NC}"
docker image prune -f

echo -e "${YELLOW}🚀 Starting services...${NC}"
docker-compose -f docker-compose.prod.yml up -d

echo -e "${YELLOW}⏳ Waiting for services to be healthy...${NC}"
sleep 10

# Check if services are running
if docker ps | grep -q "leetcode-backend-prod"; then
    echo -e "${GREEN}✅ Backend is running!${NC}"
else
    echo -e "${RED}❌ Backend failed to start${NC}"
    docker-compose -f docker-compose.prod.yml logs backend
    exit 1
fi

if docker ps | grep -q "leetcode-postgres-prod"; then
    echo -e "${GREEN}✅ Database is running!${NC}"
else
    echo -e "${RED}❌ Database failed to start${NC}"
    docker-compose -f docker-compose.prod.yml logs postgres
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo ""
echo "📊 Service Status:"
docker-compose -f docker-compose.prod.yml ps
echo ""
echo "📝 View logs:"
echo "  docker-compose -f docker-compose.prod.yml logs -f backend"
echo ""
echo "🔍 Health check:"
echo "  curl http://localhost:3001/api/health"
