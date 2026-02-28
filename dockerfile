
FROM node:20-alpine

RUN apk add --no-cache curl

WORKDIR /app

# Copy package files first (better layer caching)
COPY package*.json ./
COPY node_modules ./node_modules

# Install all dependencies
RUN npm install

# Copy source code
COPY . .

# Build NestJS app
RUN npm run build

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "dist/main"]