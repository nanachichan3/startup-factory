FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy source (TypeScript files)
COPY tsconfig.json ./
COPY src ./src

# Install tsx globally (lightweight ts runner, no compile needed)
RUN npm install -g tsx

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S discord-gateway -u 1001
USER discord-gateway

EXPOSE 3000

# Run directly with tsx (no build step needed)
CMD ["node", "--import", "tsx", "src/index.ts"]
