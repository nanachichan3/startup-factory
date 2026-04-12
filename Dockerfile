# Builder stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files from packages/harness
COPY packages/harness/package*.json ./

# Install all dependencies (including dev for build)
RUN npm ci

# Copy source and prisma schema from packages/harness
COPY packages/harness/src ./src
COPY packages/harness/prisma ./prisma

# Build TypeScript
RUN npm run build

# Production image
FROM node:22-alpine

WORKDIR /app

# Copy package files for production deps
COPY packages/harness/package*.json ./

# Install production dependencies only (no dev dependencies)
RUN npm ci --production

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3000

CMD ["node", "dist/index.js"]