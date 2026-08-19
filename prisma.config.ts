import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma 7 は接続 URL を schema.prisma に書けない。directUrl も廃止された。
// CLI（migrate / db）はここの url を使う。マイグレーションはプールを通さない
// 接続でないと危ないので、非プール側を渡す。
// 実行時のクライアントはプール側を使う（src/lib/prisma-client を参照）。
export default defineConfig({
  datasource: {
    url: env("POSTGRES_URL_NON_POOLING"),
  },
  schema: "prisma/schema.prisma",
});
