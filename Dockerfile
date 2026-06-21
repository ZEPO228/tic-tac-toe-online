FROM oven/bun:1.1 AS base

WORKDIR /app

# Install system dependencies
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

# Make start script executable
RUN chmod +x start.sh

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["bash", "start.sh"]
