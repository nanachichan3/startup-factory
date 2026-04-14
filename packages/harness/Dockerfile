# Minimal builder stage — just to hold node_modules/.prisma
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files (context is repo root)
COPY package*.json ./

# Install dependencies (prisma + client needed for generate)
RUN npm install --legacy-peer-deps --no-fund --no-audit

# Copy prisma schema
COPY packages/harness/prisma ./prisma

# Generate Prisma client (needed for runtime)
RUN DATABASE_URL=postgresql://dummy npx prisma generate --schema=./prisma/schema.prisma

# Production image
FROM node:22-alpine

WORKDIR /app

# Copy package files and install production deps only
COPY package*.json ./
RUN npm install --production --legacy-peer-deps --no-fund --no-audit

# Copy Prisma client from builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy pre-compiled TypeScript output (committed to git)
COPY packages/harness/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3000

CMD ["node", "dist/index.js"]