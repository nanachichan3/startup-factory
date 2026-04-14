# Builder stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files (from packages/harness context)
COPY package*.json ./

# Install all dependencies
RUN npm install --legacy-peer-deps

# Copy source and prisma schema
COPY src ./src
COPY prisma ./prisma

# Generate Prisma client (needs DATABASE_URL env var set)
RUN DATABASE_URL=postgresql://dummy ./node_modules/.bin/prisma generate --schema=./prisma/schema.prisma

# Build TypeScript explicitly
RUN ./node_modules/.bin/tsc --project ./tsconfig.json

# Production image
FROM node:22-alpine

WORKDIR /app

# Copy package files for production deps
COPY package*.json ./

# Install production dependencies only
RUN npm install --production --legacy-peer-deps

# Copy Prisma client from builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy built artifacts
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3000

CMD ["node", "dist/index.js"]
