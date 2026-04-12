# Multi-stage build for Startup Factory Harness
FROM node:22-alpine AS builder

WORKDIR /app

# Copy only the harness package files (no monorepo root needed)
COPY packages/harness/package.json packages/harness/package-lock.json* ./

# Install dependencies (including dev for build)
RUN npm ci || npm install

# Copy all source code
COPY packages/harness/src ./src
COPY packages/harness/prisma ./prisma

# Build TypeScript
RUN npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Copy only package files needed for production
COPY packages/harness/package.json packages/harness/package-lock.json* ./

# Install production dependencies only
RUN npm ci --production || npm install --omit=dev

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3000

CMD ["node", "dist/index.js"]