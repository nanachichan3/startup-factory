# Startup Factory Docker Image
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/harness/package*.json ./packages/harness/

# Install dependencies
RUN npm ci --ignore-scripts

# Copy source
COPY packages/harness/src ./packages/harness/src
COPY packages/harness/tsconfig.json ./packages/harness/

# Build TypeScript
WORKDIR /app/packages/harness
RUN npm run build

# Production image
FROM node:22-alpine

WORKDIR /app

# Copy built artifacts
COPY --from=builder /app/packages/harness/dist ./dist
COPY --from=builder /app/packages/harness/package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev --ignore-scripts

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]
