import env from "@/env";
import { prismaDirectClient as prismaClient } from "@/lib/prisma-client";
import * as cheerio from "cheerio";
import { type Element } from "domhandler";
import { type NextRequest, NextResponse } from "next/server";
import sleep from "sleep-promise";

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
        const writer = await prismaClient.writer.upsert({
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
    await prismaClient.$transaction(async (tx) => {
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

async function fetchAndProcessPage(
  url: string,
  writers: Writer[],
): Promise<{ articleCount: number; failedArticles: number }> {
  let failedArticles = 0;

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

  for (const articleElement of articleElements) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await processArticle($, articleElement, writers);

        break;
      } catch {
        if (attempt === MAX_RETRIES) {
          failedArticles++;
          console.log(
            `Failed to process article after ${MAX_RETRIES} attempts`,
          );
        } else {
          await sleep(RETRY_DELAY);
        }
      }
    }
  }

  return { articleCount: articleElements.length, failedArticles };
}

// eslint-disable-next-line import/prefer-default-export
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
    const writers = await prismaClient.writer.findMany();

    console.log(`Found ${writers.length} existing writers`);

    let totalFailedArticles = 0;

    console.log("Processing main page");

    const main = await fetchAndProcessPage(BASE_URL, writers);

    totalFailedArticles += main.failedArticles;
    await sleep(PAGE_DELAY);

    let page = 1;

    while (true) {
      try {
        const pageUrl = `${BASE_URL}/newpost/page/${page}`;

        console.log(`Processing page ${page}`);

        const result = await fetchAndProcessPage(pageUrl, writers);

        totalFailedArticles += result.failedArticles;

        if (result.articleCount === 0) {
          console.log(`Finished - page ${page} had no articles`);

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
      `Scraping completed. Failed articles: ${totalFailedArticles}, Last page: ${page - 1}`,
    );

    return NextResponse.json({
      failedArticles: totalFailedArticles,
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
