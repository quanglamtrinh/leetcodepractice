# Deployment Guide

This guide covers deploying the LeetCode Practice App to various environments.

## Table of Contents

- [Local Development with Docker](#local-development-with-docker)
- [AWS Deployment](#aws-deployment)
- [Environment Variables](#environment-variables)
- [Database Migration](#database-migration)

## Local Development with Docker

### Prerequisites

- Docker Desktop installed
- Docker Compose installed

### Quick Start

1. **Create environment file**:
   ```bash
   cp env.example .env
   # Edit .env with your database credentials
   ```

2. **Start all services**:
   ```bash
   docker-compose up -d
   ```

3. **View logs**:
   ```bash
   docker-compose logs -f app
   ```

4. **Stop services**:
   ```bash
   docker-compose down
   ```

5. **Stop and remove volumes** (clears database):
   ```bash
   docker-compose down -v
   ```

### Development Workflow

```bash
# Rebuild after code changes
docker-compose up -d --build

# Run migrations
docker-compose exec app npm run db:migrate

# Seed database
docker-compose exec app npm run db:seed

# Access database
docker-compose exec postgres psql -U leetcodeuser -d leetcode_practice
```

## AWS Deployment

### Option 1: AWS App Runner (Easiest)

AWS App Runner provides the simplest deployment path with automatic HTTPS and scaling.

#### Steps:

1. **Push image to Amazon ECR**:
   ```bash
   # Create ECR repository
   aws ecr create-repository --repository-name leetcode-practice

   # Authenticate Docker to ECR
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

   # Build and push
   docker build -t leetcode-practice .
   docker tag leetcode-practice:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/leetcode-practice:latest
   docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/leetcode-practice:latest
   ```

2. **Create RDS PostgreSQL database**:
   ```bash
   # Via AWS Console or CLI
   aws rds create-db-instance \
     --db-instance-identifier leetcode-db \
     --db-instance-class db.t3.micro \
     --engine postgres \
     --master-username admin \
     --master-user-password <your-password> \
     --allocated-storage 20
   ```

3. **Create App Runner service**:
   - Go to AWS App Runner console
   - Click "Create service"
   - Choose "Container registry" → "Amazon ECR"
   - Select your image
   - Configure environment variables (see below)
   - Deploy

4. **Configure environment variables in App Runner**:
   ```
   DB_HOST=<rds-endpoint>
   DB_PORT=5432
   DB_NAME=leetcode_practice
   DB_USER=admin
   DB_PASSWORD=<your-password>
   PORT=3001
   NODE_ENV=production
   ```

### Option 2: ECS Fargate

For more control and integration with other AWS services.

#### Steps:

1. **Create ECS Cluster**
2. **Create Task Definition** with your ECR image
3. **Create ECS Service**
4. **Set up Application Load Balancer**
5. **Configure environment variables**

See [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/) for detailed steps.

### Option 3: EC2 (Traditional)

1. **Launch EC2 instance** (t3.micro for hobby projects)
2. **Install Docker** on EC2
3. **Pull and run image**:
   ```bash
   docker pull <your-ecr-image>
   docker run -d -p 3001:3001 --env-file .env <your-ecr-image>
   ```

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_HOST` | Database hostname | `localhost` or RDS endpoint |
| `DB_PORT` | Database port | `5432` |
| `DB_NAME` | Database name | `leetcode_practice` |
| `DB_USER` | Database username | `leetcodeuser` |
| `DB_PASSWORD` | Database password | `<secure-password>` |
| `PORT` | Application port | `3001` |
| `NODE_ENV` | Environment | `development` or `production` |

### Setting Environment Variables

**AWS App Runner**: Use the "Environment variables" section in the console

**ECS**: Define in Task Definition under "Environment"

**EC2**: Use `.env` file or export in shell

**Docker Compose**: Define in `.env` file (local dev only)

## Database Migration

### Initial Setup

When deploying for the first time:

1. **Create database schema**:
   ```bash
   # If using docker-compose
   docker-compose exec app npm run setup

   # If using AWS
   # Connect to RDS and run comprehensive-schema.sql
   psql -h <rds-endpoint> -U admin -d leetcode_practice -f comprehensive-schema.sql
   ```

2. **Run migrations**:
   ```bash
   npm run db:migrate
   ```

3. **Seed data**:
   ```bash
   npm run db:seed
   ```

### Ongoing Migrations

For schema updates:

1. Create new migration file in `migrations/` directory
2. Run migrations: `npm run db:migrate`

## CI/CD with GitHub Actions

The project includes a GitHub Actions workflow (`.github/workflows/ci.yml`) that:

1. Lints code on every push/PR
2. Builds Docker image
3. (Optional) Pushes to ECR on main branch

### Enabling ECR Push

1. **Create AWS IAM user** with ECR permissions
2. **Add secrets to GitHub repository**:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
3. **Uncomment the `push-to-ecr` job** in `.github/workflows/ci.yml`

## Health Checks

The application exposes a health check endpoint:

```bash
curl http://your-domain:3001/api/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2025-10-20T...",
  "database": "connected"
}
```

## Monitoring & Logs

### Docker Compose (Local)
```bash
docker-compose logs -f app
```

### AWS App Runner
- View logs in CloudWatch Logs
- App Runner automatically creates log groups

### ECS
- Configure CloudWatch Logs in Task Definition
- View in CloudWatch Logs console

## Troubleshooting

### Database Connection Issues

1. **Check environment variables** are set correctly
2. **Verify security groups** (AWS) allow traffic on port 5432
3. **Test connection**:
   ```bash
   psql -h $DB_HOST -U $DB_USER -d $DB_NAME
   ```

### Container Won't Start

1. **Check logs**:
   ```bash
   docker logs <container-id>
   ```
2. **Verify all environment variables** are set
3. **Test locally** with docker-compose first

### Performance Issues

1. **Check database indexes**: Run `npm run db:migrate`
2. **Monitor database connections**: May need to adjust pool size in `server.js`
3. **Scale horizontally**: Add more container instances

## Cost Optimization

### AWS Free Tier
- **App Runner**: First container gets partial free tier
- **RDS**: db.t3.micro eligible for free tier (12 months)
- **ECR**: 500MB storage free

### Cost-Effective Options
- **App Runner**: ~$5-10/month for small apps
- **Lightsail**: Flat $3.50/month for container + database
- **Render.com**: Free tier available (alternative to AWS)

## Security Best Practices

1. **Never commit `.env` files**
2. **Use AWS Secrets Manager** for production secrets
3. **Enable SSL/TLS** (App Runner provides this automatically)
4. **Regularly update dependencies**: `npm audit fix`
5. **Use least-privilege IAM roles**
6. **Enable CloudWatch alarms** for monitoring

## Next Steps

- Set up automated backups for RDS
- Configure custom domain with Route 53
- Add Redis for caching (optional)
- Implement rate limiting
- Set up monitoring dashboards

---

For more information, see the [main README](../README.md).

