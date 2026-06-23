import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// In production, log only errors + warnings (not every query — log noise + perf).
// In development, same — full query logging was producing tons of log spam.
const logOptions: ('error' | 'warn')[] = ['error', 'warn']

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: logOptions,
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
