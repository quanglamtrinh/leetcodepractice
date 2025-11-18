# Backend Dockerfile for EC2 deployment
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy server package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy server source code
COPY . .

# Create necessary directories
RUN mkdir -p logs data backups

# Expose backend port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Run the server
CMD ["node", "server.js"]
