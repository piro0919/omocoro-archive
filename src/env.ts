import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const env = createEnv({
  client: {},
  experimental__runtimeEnv: {},
  server: {
    CRON_SECRET: z.string().min(1),
    POSTGRES_PRISMA_URL: z.string().url(),
    POSTGRES_URL_NON_POOLING: z.string().url(),
  },
});

export default env;
