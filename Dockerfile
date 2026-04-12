# Multi-stage build for Startup Factory Harness
FROM node:22-bullseye AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy root package files first (for workspace deps)
COPY package.json package-lock.json ./

# Copy harness package files
COPY packages/harness/package.json ./
COPY packages/harness/prisma ./prisma
COPY packages/harness/tsconfig.json ./
COPY packages/harness/src ./src

# Install dependencies (root-level installs all workspace deps including discord.js, mem0ai)
RUN npm install

# Build TypeScript
RUN npx tsc

# Generate Prisma client
RUN npx prisma generate --schema=./prisma/schema.prisma

# Production stage
FROM node:22-bullseye

WORKDIR /app

# Install runtime dependencies for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy root package files for production install
COPY package.json package-lock.json ./

# Install production dependencies
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