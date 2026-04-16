# Build stage
FROM node:22-alpine AS builder

# Declare build args as env vars
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

# Install OpenSSL + build tools (needed for Prisma)
RUN apk add --no-cache openssl python3 make g++

# Copy harness package files (context is project root, dockerfile in packages/harness/)
COPY package*.json ./
COPY packages/harness/package*.json ./harness/
COPY packages/harness/prisma ./harness/prisma
COPY packages/harness/tsconfig.json ./harness/
COPY packages/harness/src ./harness/src

# Install all deps (including devDeps for build)
RUN cd harness && npm install --legacy-peer-deps --no-fund --no-audit

# Build TypeScript and generate Prisma client
RUN cd harness && npx prisma generate --schema=./prisma/schema.prisma \
    && ./node_modules/.bin/tsc --project ./tsconfig.json

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

# Copy package files and install production deps only
COPY packages/harness/package*.json ./
RUN npm install --production --legacy-peer-deps --no-fund --no-audit

# Copy generated Prisma client and compiled TS from builder
COPY --from=builder /app/harness/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/harness/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/harness/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3000

CMD ["node", "dist/index.js"]