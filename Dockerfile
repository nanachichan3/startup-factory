# Multi-stage build for Startup Factory Harness
FROM node:20-bullseye AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy only the harness package files (no monorepo root needed)
COPY packages/harness/package.json ./

# Install dependencies (npm install is more forgiving than npm ci)
RUN npm install

# Copy all source code
COPY packages/harness/src ./src
COPY packages/harness/prisma ./prisma
COPY packages/harness/tsconfig.json ./

# Build TypeScript
RUN npx tsc

# Generate Prisma client
RUN npx prisma generate --schema=./prisma/schema.prisma

# Production stage
FROM node:20-bullseye

WORKDIR /app

# Install runtime dependencies for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy only package files needed for production
COPY packages/harness/package.json ./

# Install production dependencies only
RUN npm install --omit=dev

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

# Create non-root user
RUN groupadd --gid 1001 appgroup && useradd --uid 1001 --gid appgroup appuser
USER appuser

EXPOSE 3000

CMD ["node", "dist/index.js"]