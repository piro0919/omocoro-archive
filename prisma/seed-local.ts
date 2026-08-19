import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.development.local" });

if (!process.env.POSTGRES_PRISMA_URL) {
  throw new Error("POSTGRES_PRISMA_URL is not set in .env.development.local");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.POSTGRES_PRISMA_URL }),
  log: ["info", "warn", "error"],
});
// サンプルカテゴリデータ
const categories = [
  { id: "1", name: "マンガ" },
  { id: "2", name: "コラム" },
  { id: "3", name: "動画" },
  { id: "4", name: "企画" },
];
// サンプルライターデータ
const writers = [
  {
    avatarUrl: "https://omocoro.jp/assets/uploads/2023/01/harada.jpg",
    id: "1",
    name: "原田まりる",
    profileUrl: "https://omocoro.jp/profile/harada",
  },
  {
    avatarUrl: "https://omocoro.jp/assets/uploads/2023/01/arufa.jpg",
    id: "2",
    name: "ARuFa",
    profileUrl: "https://omocoro.jp/profile/arufa",
  },
  {
    avatarUrl: "https://omocoro.jp/assets/uploads/2023/01/yoppie.jpg",
    id: "3",
    name: "ヨッピー",
    profileUrl: "https://omocoro.jp/profile/yoppie",
  },
  {
    avatarUrl: "https://omocoro.jp/assets/uploads/2023/01/sebuyama.jpg",
    id: "4",
    name: "セブ山",
    profileUrl: "https://omocoro.jp/profile/sebuyama",
  },
];
// サンプル記事データ
const articles = [
  {
    categoryId: "4", // 企画
    id: "1",
    publishedAt: new Date("2024-01-15"),
    thumbnail: "https://picsum.photos/400/300?random=1",
    title: "今年一番笑った記事を決める大会",
    url: "https://omocoro.jp/kiji/123456",
    writerIds: ["1", "2"], // 原田まりる、ARuFa
  },
  {
    categoryId: "2", // コラム
    id: "2",
    publishedAt: new Date("2024-02-10"),
    thumbnail: "https://picsum.photos/400/300?random=2",
    title: "猫と暮らして分かった10のこと",
    url: "https://omocoro.jp/kiji/234567",
    writerIds: ["3"], // ヨッピー
  },
  {
    categoryId: "1", // マンガ
    id: "3",
    publishedAt: new Date("2024-03-05"),
    thumbnail: "https://picsum.photos/400/300?random=3",
    title: "一人でファミレスに行く方法を考えた",
    url: "https://omocoro.jp/kiji/345678",
    writerIds: ["4"], // セブ山
  },
  {
    categoryId: "3", // 動画
    id: "4",
    publishedAt: new Date("2024-04-20"),
    thumbnail: "https://picsum.photos/400/300?random=4",
    title: "【動画】街で見かけた変な看板を調査してみた",
    url: "https://omocoro.jp/kiji/456789",
    writerIds: ["2", "3"], // ARuFa、ヨッピー
  },
  {
    categoryId: "2", // コラム
    id: "5",
    publishedAt: new Date("2024-05-12"),
    thumbnail: "https://picsum.photos/400/300?random=5",
    title: "コンビニの新商品を全部食べ比べした結果",
    url: "https://omocoro.jp/kiji/567890",
    writerIds: ["1"], // 原田まりる
  },
];

async function seedDatabase(): Promise<void> {
  try {
    console.log("🌱 Starting local database seeding...");

    // 既存データをクリア（開発環境なので安全）
    console.log("🧹 Cleaning existing data...");
    await prisma.article.deleteMany();
    await prisma.writer.deleteMany();
    await prisma.category.deleteMany();

    // カテゴリを挿入
    console.log("📊 Seeding categories...");

    for (const category of categories) {
      await prisma.category.create({
        data: category,
      });
      console.log(`  ✓ Created category: ${category.name}`);
    }

    // ライターを挿入
    console.log("✍️ Seeding writers...");

    for (const writer of writers) {
      await prisma.writer.create({
        data: writer,
      });
      console.log(`  ✓ Created writer: ${writer.name}`);
    }

    // 記事を挿入
    console.log("📝 Seeding articles...");

    for (const article of articles) {
      const { writerIds, ...articleData } = article;

      await prisma.article.create({
        data: {
          ...articleData,
          writers: {
            connect: writerIds.map((id) => ({ id })),
          },
        },
      });
      console.log(`  ✓ Created article: ${article.title}`);
    }

    console.log("✨ Local database seeding completed successfully!");
    console.log(
      `📊 Seeded: ${categories.length} categories, ${writers.length} writers, ${articles.length} articles`,
    );
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// エラーハンドリング
process.on("unhandledRejection", (error) => {
  console.error("❌ Unhandled rejection:", error);
  process.exit(1);
});

seedDatabase().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
