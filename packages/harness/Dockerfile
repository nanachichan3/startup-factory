# Production runtime only — dist is pre-compiled and committed to git
# node_modules/.prisma is copied from the builder stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files (from packages/harness context)
COPY package*.json ./

# Install all dependencies
RUN npm install --legacy-peer-deps --no-fund --no-audit

# Copy source and prisma schema
COPY src ./src
COPY prisma ./prisma

# Generate Prisma client (creates node_modules/.prisma)
RUN DATABASE_URL=postgresql://dummy npx prisma generate --schema=./prisma/schema.prisma

# Copy pre-compiled TypeScript output (committed to git)
COPY dist ./dist

# Production image
FROM node:22-alpine

WORKDIR /app

# Copy package files and install production deps only
COPY package*.json ./
RUN npm install --production --legacy-peer-deps --no-fund --no-audit

# Copy Prisma client from builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy pre-compiled TypeScript output
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3000

CMD ["node", "dist/index.js"]