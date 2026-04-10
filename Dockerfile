FROM node:22-alpine AS builder

WORKDIR /app

# Copy root package files and lockfile for monorepo
COPY package*.json ./
COPY packages/harness/package*.json packages/harness/tsconfig.json ./

# Install dependencies (use install since lockfile is at root, not in harness)
RUN npm install

# Copy source
COPY packages/harness/src ./src

# Build TypeScript
RUN npm run build

# Production image
FROM node:22-alpine

WORKDIR /app

# Copy built artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Install production dependencies only
RUN npm install --omit=dev

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3000

CMD ["node", "dist/index.js"]
