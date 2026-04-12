FROM node:20-alpine

WORKDIR /app

# Install all dependencies (including devDependencies for build)
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Remove devDependencies to keep image small
RUN npm prune --production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S discord-gateway -u 1001
USER discord-gateway

# Expose default port
EXPOSE 3000

CMD ["node", "dist/index.js"]
