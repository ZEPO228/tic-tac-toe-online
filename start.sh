#!/bin/bash
set -e

echo "[start] Starting tic-tac-toe server..."
echo "[start] NODE_ENV=$NODE_ENV"
echo "[start] PORT=$PORT"
echo "[start] DATABASE_URL exists: $([ -n "$DATABASE_URL" ] && echo yes || echo no)"

# Try to push prisma schema (non-fatal)
if [ -n "$DATABASE_URL" ]; then
  echo "[start] Running prisma db push..."
  bunx prisma db push --accept-data-loss 2>&1 || echo "[start] WARNING: prisma db push failed, continuing..."
fi

echo "[start] Starting bun server.ts..."
exec bun server.ts
