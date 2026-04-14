# Builder stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files (from packages/harness context)
COPY package*.json ./

# Install all dependencies
RUN npm install --legacy-peer-deps --no-fund --no-audit 2>&1 | tail -5

# Copy source and prisma schema
COPY src ./src
COPY prisma ./prisma

# Copy pre-compiled dist (from workspace, committed to git)
# This avoids needing TypeScript in Docker build at all
COPY dist ./dist

# Generate Prisma client (needed at runtime)
# We need @prisma/client in node_modules of the runtime image
# Since npm install in production stage won't have prisma dev deps,
# we copy the .prisma folder explicitly
COPY node_modules/.prisma ./node_modules/.prisma 2>/dev/null || echo "no .prisma to copy"

# Production image
FROM node:22-alpine

WORKDIR /app

# Copy package files and install production deps only
COPY package*.json ./
RUN npm install --production --legacy-peer-deps --no-fund --no-audit

# Copy Prisma client (generated during local build)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma 2>/dev/null || echo "no @prisma to copy"

# Copy pre-compiled TypeScript output
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3000

CMD ["node", "dist/index.js"]