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
// connect_timeout=30 covers Neon serverless compute cold-starts; the default 5s
// races the wake-up and intermittently fails the first query of the day.
function withConnectTimeout(url: string): string {
  if (!url) return url;
  if (/[?&]connect_timeout=/.test(url)) return url;

  return `${url}${url.includes("?") ? "&" : "?"}connect_timeout=30`;
}

export function getPrismaDirectClient(): PrismaClient {
  if (!globalForPrisma.prismaDirect) {
    const url = withConnectTimeout(
      process.env.POSTGRES_URL_NON_POOLING ??
        process.env.POSTGRES_PRISMA_URL ??
        "",
    );

    globalForPrisma.prismaDirect = new PrismaClient({
      datasources: { db: { url } },
    });
  }

  return globalForPrisma.prismaDirect;
}

export default prismaClient;
