# Use Bun as the runtime (matches our dev environment)
FROM oven/bun:1.1 AS base

# Set working directory
WORKDIR /app

# Install system dependencies for Prisma
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json bun.lock* ./
COPY prisma ./prisma/

# Install dependencies
RUN bun install --frozen-lockfile

# Generate Prisma client
RUN bunx prisma generate

# Copy source code
COPY . .

# Build Next.js
RUN bun run build

# Expose port
EXPOSE 3000

# Set environment
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Start the server
CMD ["bun", "server.ts"]
