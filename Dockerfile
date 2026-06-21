# Use Node.js 20 as base (Railway-friendly)
FROM node:20-slim AS base

WORKDIR /app

# Install system dependencies for Prisma + OpenSSL
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install bun
RUN npm install -g bun

# Copy package files
COPY package.json bun.lock* ./
COPY prisma ./prisma/

# Install dependencies
RUN bun install --frozen-lockfile || bun install

# Generate Prisma client
RUN bunx prisma generate

# Copy source code
COPY . .

# Build Next.js
RUN bun run build

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Start with a simple script
CMD ["sh", "-c", "bunx prisma db push --accept-data-loss 2>&1 || true; exec bun server.ts"]
