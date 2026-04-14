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
ENV DATABASE_URL=${DATABASE_URL:-}
ENV NODE_ENV=production

WORKDIR /app

# Copy package files (context is repo root)
COPY package*.json ./

# Debug: check what node/npm versions we have
RUN node --version && npm --version

# Install ALL dependencies (including dev — needed for prisma CLI + typescript)
# Use --include=dev to ensure devDependencies are installed even with NODE_ENV=production
RUN npm install --legacy-peer-deps --include=dev --no-fund --no-audit

# Debug: verify prisma binary exists
RUN ls node_modules/.bin/ | grep prisma || (echo "PRISMA NOT FOUND"; ls node_modules/ | head -20)

# Copy source and prisma schema
COPY packages/harness/src ./src
COPY packages/harness/prisma ./prisma

# Generate Prisma client (DATABASE_URL can be dummy — no real connection needed)
RUN DATABASE_URL=${DATABASE_URL:-postgresql://dummy} ./node_modules/.bin/prisma generate --schema=./prisma/schema.prisma

# Build TypeScript
RUN ./node_modules/.bin/tsc --project ./packages/harness/tsconfig.json

# Production image
FROM node:22-alpine

WORKDIR /app

# Declare build args as env vars for runtime
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

# Copy package files and install production deps only
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
