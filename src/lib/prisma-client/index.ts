import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
  prismaDirect: PrismaClient | undefined;
};

export const prismaClient = globalForPrisma.prisma ?? new PrismaClient();

// Long-running jobs (scrape cron) use the unpooled connection so they don't
// starve user-traffic queries through the small PgBouncer pool.
export const prismaDirectClient =
  globalForPrisma.prismaDirect ??
  new PrismaClient({
    datasources: {
      db: {
        url:
          process.env.POSTGRES_URL_NON_POOLING ??
          process.env.POSTGRES_PRISMA_URL ??
          "",
      },
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prismaClient;
  globalForPrisma.prismaDirect = prismaDirectClient;
}

export default prismaClient;
