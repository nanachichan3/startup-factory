FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install deps (npm install is faster than npm ci in alpine)
RUN npm install --ignore-scripts

# Copy source
COPY tsconfig.json ./
COPY src ./src

# Run directly with node + tsx (installed globally)
RUN npm install -g tsx typescript @types/node

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S discord-gateway -u 1001
USER discord-gateway

EXPOSE 3000

CMD ["npx", "tsx", "src/index.ts"]
