FROM node:22-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package*.json ./

# Copy harness package files
COPY packages/harness/package*.json packages/harness/tsconfig.json ./

# Install all dependencies (including dev for prisma generate)
RUN npm install

# Copy source and prisma schema
COPY packages/harness/src ./src
COPY packages/harness/prisma ./prisma

# Generate Prisma client
RUN npx prisma@5.22.0 generate --schema=./prisma/schema.prisma

# Build TypeScript
RUN npm run build

# Production image
FROM node:22-alpine

WORKDIR /app

# Install production deps + prisma CLI (for migrate deploy on startup)
COPY package*.json ./
RUN npm install --omit=dev && npm install prisma@5.22.0

# Copy prisma schema and generated client
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy built artifacts
COPY --from=builder /app/dist ./dist

# Copy package.json for scripts
COPY --from=builder /app/package*.json ./

EXPOSE 3000

CMD ["node", "dist/index.js"]
