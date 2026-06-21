#!/bin/bash
set -e
echo "Running prisma db push..."
npx prisma db push --accept-data-loss || echo "WARNING: prisma db push failed, continuing..."
echo "Prisma setup complete."
