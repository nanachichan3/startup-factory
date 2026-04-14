# Builder stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files (from packages/harness context)
COPY package*.json ./

# Install all dependencies
RUN npm install --legacy-peer-deps --no-fund --no-audit 2>&1 | tail -5

# Install TypeScript globally (handles any hoisting issues)
RUN npm install -g typescript --no-fund --no-audit 2>&1 | tail -3

# Verify tsc is available
RUN tsc --version

# Copy source and prisma schema
COPY src ./src
COPY prisma ./prisma

# Generate Prisma client
RUN DATABASE_URL=postgresql://dummy npx prisma generate --schema=./prisma/schema.prisma 2>&1 | tail -3

# Build TypeScript
RUN tsc --project ./tsconfig.json

# Production image
FROM node:22-alpine

WORKDIR /app

# Copy package files and install production deps only
COPY package*.json ./
RUN npm install --production --legacy-peer-deps --no-fund --no-audit

# Copy Prisma client from builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy compiled app
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3000

CMD ["node", "dist/index.js"]
