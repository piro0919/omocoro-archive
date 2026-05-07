import env from "@/env";
import { getPrismaDirectClient } from "@/lib/prisma-client";
import * as cheerio from "cheerio";
import { type Element } from "domhandler";
import { type NextRequest, NextResponse } from "next/server";
import sleep from "sleep-promise";

export const maxDuration = 300;

const prisma = getPrismaDirectClient();
const RETRY_DELAY = 2000;
const PAGE_DELAY = 1000;
const MAX_RETRIES = 5;
const BASE_URL = "https://omocoro.jp";

type Writer = {
  avatarUrl?: string;
  id: string;
  name: string;
  profileUrl?: string;
};

type ArticleInput = {
  category: string;
  publishedAt: Date | null;
  thumbnail: string;
  title: string;
  url: string;
};

function extractArticleData(
  $: cheerio.CheerioAPI,
  article: cheerio.Cheerio<Element>,
): ArticleInput | null {
  try {
    const title = article.find(".title").text().trim();
    const url = article.find(".image a").attr("href");
    const thumbnail = article.find(".image img").attr("src") ?? "";
    const category = article.find(".category").text().trim();
    const publishedAtStr = article.find(".date").text().trim();

    if (!(typeof url === "string" && url.length > 0) || !title || !category) {
      console.log(`Skipping invalid article: ${title || "No title"}`);

      return null;
    }

    if (!publishedAtStr) {
      console.log(`Skipping article without date: ${title}`);

      return null;
    }

    const parsed = new Date(publishedAtStr);
    const publishedAt = Number.isNaN(parsed.getTime()) ? null : parsed;

    return { category, publishedAt, thumbnail, title, url };
  } catch (error) {
    console.error("Error extracting article data:", error);

    return null;
  }
}

async function processWriters(
  $: cheerio.CheerioAPI,
  article: cheerio.Cheerio<Element>,
  existingWriters: Writer[],
): Promise<string[]> {
  const writerIds: string[] = [];

  try {
    const staffElements = article.find(".staffs a");

    for (const staffElement of staffElements) {
      const $staff = $(staffElement);
      const name = $staff.text().trim();

      if (!name) continue;

      const existingWriter = existingWriters.find((w) => w.name === name);

      if (existingWriter) {
        writerIds.push(existingWriter.id);
        continue;
      }

      const avatarUrl = $staff.find("img").attr("src") ?? "";
      const profileUrl = $staff.attr("href") ?? "";

      try {
        const writer = await prisma.writer.upsert({
          create: { avatarUrl, name, profileUrl },
          update: {},
          where: { name },
        });

        writerIds.push(writer.id);
        existingWriters.push(writer);
      } catch (error) {
        console.error(`Failed to upsert writer: ${name}`, error);
      }
    }
  } catch (error) {
    console.error("Error processing writers:", error);
  }

  return writerIds;
}

async function processArticle(
  $: cheerio.CheerioAPI,
  articleElement: Element,
  writers: Writer[],
): Promise<void> {
  const $article = $(articleElement);
  const articleData = extractArticleData($, $article);

  if (!articleData) {
    throw new Error("Failed to extract article data");
  }

  try {
    console.log(`Processing: ${articleData.title}`);

    const writerIds = await processWriters($, $article, writers);

    // カテゴリーの作成と記事の作成/更新を1つのトランザクションで実行
    await prisma.$transaction(async (tx) => {
      // カテゴリーの作成または取得
      const category = await tx.category.upsert({
        create: { name: articleData.category },
        update: {},
        where: { name: articleData.category },
      });

      // 記事の作成または更新
      await tx.article.upsert({
        create: {
          category: { connect: { id: category.id } },
          publishedAt: articleData.publishedAt,
          thumbnail: articleData.thumbnail,
          title: articleData.title,
          url: articleData.url,
          writers: { connect: writerIds.map((id) => ({ id })) },
        },
        update: {
          category: { connect: { id: category.id } },
          publishedAt: articleData.publishedAt,
          thumbnail: articleData.thumbnail,
          title: articleData.title,
          writers: { set: writerIds.map((id) => ({ id })) },
        },
        where: { url: articleData.url },
      });
    });
  } catch (error) {
    console.error("Error processing article:", {
      error: error instanceof Error ? error.message : "Unknown error",
      title: articleData.title,
      url: articleData.url,
    });
    throw error;
  }
}

type PageFailure = {
  error: string;
  pageUrl: string;
  url: string;
};

async function fetchAndProcessPage(
  url: string,
  writers: Writer[],
): Promise<{
  articleCount: number;
  failures: PageFailure[];
  newArticles: number;
}> {
  const failures: PageFailure[] = [];
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const articleElements =
    url === BASE_URL
      ? $(".new-entries .box:not(.ad)")
      : $(".category-inner .box:not(.ad)");

  console.log(`Found ${articleElements.length} articles on ${url}`);

  const urls = articleElements
    .map((_, el) => $(el).find(".image a").attr("href"))
    .get()
    .filter((u): u is string => typeof u === "string" && u.length > 0);
  const existing = await prisma.article.findMany({
    select: { url: true },
    where: { url: { in: urls } },
  });
  const existingUrls = new Set(existing.map((a) => a.url));
  const newArticles = urls.filter((u) => !existingUrls.has(u)).length;

  for (const articleElement of articleElements) {
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await processArticle($, articleElement, writers);
        lastError = undefined;

        break;
      } catch (error) {
        lastError = error;

        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_DELAY);
        }
      }
    }

    if (lastError) {
      const articleUrl =
        $(articleElement).find(".image a").attr("href") ?? "(unknown)";
      const message =
        lastError instanceof Error ? lastError.message : String(lastError);

      console.error(
        `Failed to process article after ${MAX_RETRIES} attempts: ${articleUrl} — ${message}`,
      );
      failures.push({ error: message, pageUrl: url, url: articleUrl });
    }
  }

  return {
    articleCount: articleElements.length,
    failures,
    newArticles,
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  console.log("Starting scraping process");

  const authHeader = request.headers.get("authorization");

  if (
    process.env.NODE_ENV !== "development" &&
    authHeader !== `Bearer ${env.CRON_SECRET}`
  ) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        success: false,
      },
      { status: 401 },
    );
  }

  try {
    const writers = await prisma.writer.findMany();

    console.log(`Found ${writers.length} existing writers`);

    const allFailures: PageFailure[] = [];

    console.log("Processing main page");

    const main = await fetchAndProcessPage(BASE_URL, writers);

    allFailures.push(...main.failures);
    await sleep(PAGE_DELAY);

    let page = 1;

    while (true) {
      try {
        const pageUrl = `${BASE_URL}/newpost/page/${page}`;

        console.log(`Processing page ${page}`);

        const result = await fetchAndProcessPage(pageUrl, writers);

        allFailures.push(...result.failures);

        if (result.articleCount === 0) {
          console.log(`Finished - page ${page} had no articles`);

          break;
        }

        if (result.newArticles === 0) {
          console.log(
            `Finished - page ${page} had no new articles (all already in DB)`,
          );

          break;
        }

        page++;
        await sleep(PAGE_DELAY);
      } catch (error) {
        console.error(`Failed to process page ${page}:`, error);

        break;
      }
    }

    console.log(
      `Scraping completed. Failed articles: ${allFailures.length}, Last page: ${page - 1}`,
    );

    return NextResponse.json({
      failedArticles: allFailures.length,
      failures: allFailures,
      lastProcessedPage: page - 1,
      success: true,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    console.error("Fatal error:", errorMessage);

    return NextResponse.json(
      {
        details: error instanceof Error ? error.stack : undefined,
        error: errorMessage,
        success: false,
      },
      { status: 500 },
    );
  }
}
