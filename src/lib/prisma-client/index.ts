import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
  prismaDirect: PrismaClient | undefined;
};

export const prismaClient = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prismaClient;
}

// Long-running jobs (scrape cron) should use the unpooled connection so they
// don't starve user-traffic queries through the small PgBouncer pool. Lazy so
// other routes don't pay for a non-pooled connection they never use.
export function getPrismaDirectClient(): PrismaClient {
  if (!globalForPrisma.prismaDirect) {
    globalForPrisma.prismaDirect = new PrismaClient({
      datasources: {
        db: {
          url:
            process.env.POSTGRES_URL_NON_POOLING ??
            process.env.POSTGRES_PRISMA_URL ??
            "",
        },
      },
    });
  }

  return globalForPrisma.prismaDirect;
}

export default prismaClient;
