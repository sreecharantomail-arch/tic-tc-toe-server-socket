# Production Dockerfile for NexaClash Server
FROM node:20-alpine AS base
WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code and assets
COPY src ./src
COPY public ./public
COPY server.js ./
COPY ecosystem.config.js ./

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose server port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Command to start application
CMD ["node", "server.js"]
