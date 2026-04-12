FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev for tsx)
RUN npm ci && npm cache clean --force

# Copy source (TypeScript files)
COPY tsconfig.json ./
COPY src ./src

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S discord-gateway -u 1001
USER discord-gateway

EXPOSE 3000

# Run directly with npx tsx (no build step needed)
CMD ["npx", "tsx", "src/index.ts"]
