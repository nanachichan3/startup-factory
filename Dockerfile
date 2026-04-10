FROM node:22-alpine AS builder

WORKDIR /app

# Copy harness package files
COPY packages/harness/package*.json packages/harness/tsconfig.json ./

# Install dependencies
RUN npm ci

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
RUN npm ci --omit=dev --workspaces=false

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3000

CMD ["node", "dist/index.js"]
