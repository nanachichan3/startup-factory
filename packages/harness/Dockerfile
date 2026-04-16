# Build stage - compile TypeScript and generate Prisma client
FROM node:22-alpine AS builder

# Build args for package installation and prisma generate
ARG DATABASE_URL=dummy://localhost
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
ENV DATABASE_URL=postgresql://dummy:dummy@localhost/dummy

WORKDIR /app

# Install build tools
RUN apk add --no-cache openssl python3 make g++ git

# Copy harness package files (context is project root, paths relative to it)
COPY packages/harness/package*.json ./harness/
WORKDIR /app/harness

# Install dependencies (including devDeps for build)
RUN npm install --legacy-peer-deps --no-fund --no-audit

# Copy source and config
WORKDIR /app
COPY packages/harness/tsconfig.json ./harness/
COPY packages/harness/prisma ./harness/prisma
COPY packages/harness/src ./harness/src

# Generate Prisma client (DATABASE_URL is set via ENV above)
WORKDIR /app/harness
RUN npx prisma generate --schema=./prisma/schema.prisma

# Build TypeScript
RUN ./node_modules/.bin/tsc --project ./tsconfig.json

# Production image - copy compiled output
FROM node:22-alpine

WORKDIR /app

# Runtime environment variables (empty, injected at container start)
ENV NODE_ENV=production
ENV TEMPORAL_ADDRESS=
ENV TEMPORAL_NAMESPACE=default
ENV DATABASE_URL=

# Copy package files and install production deps only
COPY packages/harness/package*.json ./
RUN npm install --production --legacy-peer-deps --no-fund --no-audit

# Copy generated Prisma client and compiled output from builder
COPY --from=builder /app/harness/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/harness/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/harness/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3000

CMD ["node", "dist/index.js"]