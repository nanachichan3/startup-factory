# Build stage — generates Prisma client and compiles TypeScript
FROM node:22-alpine AS builder

# Declare build args as env vars (Coolify passes them as --build-arg)
ARG DATABASE_URL
ARG OPENROUTER_API_KEY
ARG DASHBOARD_USER
ARG DASHBOARD_PASS
ARG TEMPORAL_ADDRESS
ARG TEMPORAL_NAMESPACE
ARG TEMPORAL_API_KEY
ARG DB_HOST
ARG DB_PORT
ARG DB_USER
ARG DB_PASS
ARG DB_NAME
ARG DEMO_MODE
ARG REDIS_HOST
ARG DISCORD_BOT_TOKEN
ARG FACTORY_API_URL
ARG COOLIFY_FQDN
ENV NODE_ENV=production

WORKDIR /app

# Install OpenSSL + required runtime libs (needed for Prisma's native binaries)
RUN apk add --no-cache openssl python3 make g++

# Copy ALL package files (root + all workspaces)
COPY package*.json ./

# Install root workspace deps + harness workspace deps
RUN npm install --legacy-peer-deps --no-fund --no-audit
RUN npm install --legacy-peer-deps --no-fund --no-audit --prefix ./packages/harness

# Show available binaries
RUN echo "Root .bin:" && ls node_modules/.bin/ | head -20 || echo "none"
RUN echo "Harness .bin:" && ls packages/harness/node_modules/.bin/ | head -20 || echo "none"

# Copy source and prisma schema
COPY packages/harness/src ./src
COPY packages/harness/prisma ./prisma

# Generate Prisma client with OpenSSL available
RUN DATABASE_URL=${DATABASE_URL:-postgresql://dummy} npx -y prisma@5.22.0 generate --schema=./prisma/schema.prisma

# Build TypeScript using workspace-local tsc (try root first, then harness)
RUN (./node_modules/.bin/tsc --project ./packages/harness/tsconfig.json 2>&1 || \
     ./packages/harness/node_modules/.bin/tsc --project ./packages/harness/tsconfig.json 2>&1) && echo "TSC OK" || echo "TSC FAILED"

# Production image
FROM node:22-alpine

WORKDIR /app

# Declare build args for runtime
ARG DATABASE_URL
ARG OPENROUTER_API_KEY
ARG DASHBOARD_USER
ARG DASHBOARD_PASS
ARG TEMPORAL_ADDRESS
ARG TEMPORAL_NAMESPACE
ARG TEMPORAL_API_KEY
ARG DB_HOST
ARG DB_PORT
ARG DB_USER
ARG DB_PASS
ARG DB_NAME
ARG DEMO_MODE
ARG REDIS_HOST
ARG DISCORD_BOT_TOKEN
ARG FACTORY_API_URL
ARG COOLIFY_FQDN
ENV NODE_ENV=production

# Copy package files and install production deps only (@prisma/client gets installed)
COPY package*.json ./
RUN npm install --production --legacy-peer-deps --no-fund --no-audit

# Copy generated Prisma client from builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy pre-compiled TypeScript output
COPY --from=builder /app/packages/harness/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3000

CMD ["node", "dist/index.js"]
