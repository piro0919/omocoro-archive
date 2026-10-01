import * as cheerio from "cheerio";
import { type Element } from "domhandler";
import { type NextRequest, NextResponse } from "next/server";
import sleep from "sleep-promise";
import env from "@/env";
import isAuthorizedCronRequest from "@/lib/cron-auth";
import fetchOmocoro from "@/lib/omocoro-fetch";
import { getPrismaDirectClient } from "@/lib/prisma-client";

export const maxDuration = 300;

const prisma = getPrismaDirectClient();
const RETRY_DELAY = 2000;
const PAGE_DELAY = 1000;
const MAX_RETRIES = 5;
const BASE_URL = "https://omocoro.jp";
// The run stops after this number of consecutive pages with nothing new.
// Stopping at the first all-known page meant that when a run died partway, the
// next run met the stored pages first and quit, and never visited the pages past
// the point the failed run reached. Walking three known pages further lets later
// runs reach that gap and fill it.
const KNOWN_PAGES_BEFORE_STOP = 3;

type Writer = {
  avatarUrl?: string;
  id: string;
  name: string;
  profileUrl?: string;
};

type ArticleInput = {
  category: string;
  publishedAt: Date;
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

    const parsed = publishedAtStr ? new Date(publishedAtStr) : null;
    const publishedAt =
      parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;

    if (!publishedAt) {
      console.log(`Skipping article without publish date: ${title}`);

      return null;
    }

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
  $article: cheerio.Cheerio<Element>,
  articleData: ArticleInput,
  writers: Writer[],
): Promise<void> {
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
  parsedArticles: number;
}> {
  const failures: PageFailure[] = [];
  const response = await fetchOmocoro(url);

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

  // 抽出できない記事（必須項目欠落・公開日なし）はここで除外し、
  // 新規判定・処理ループの両方でこの結果を使う
  const articles = articleElements
    .map((_, el) => {
      const $article = $(el);

      return { $article, articleData: extractArticleData($, $article) };
    })
    .get()
    .filter(
      (
        a,
      ): a is {
        $article: cheerio.Cheerio<Element>;
        articleData: ArticleInput;
      } => a.articleData !== null,
    );
  const urls = articles.map((a) => a.articleData.url);
  const existing = await prisma.article.findMany({
    select: { url: true },
    where: { url: { in: urls } },
  });
  const existingUrls = new Set(existing.map((a) => a.url));
  const newArticles = urls.filter((u) => !existingUrls.has(u)).length;

  for (const { $article, articleData } of articles) {
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await processArticle($, $article, articleData, writers);
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
      const articleUrl = articleData.url;
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
    parsedArticles: articles.length,
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  console.log("Starting scraping process");

  if (
    !isAuthorizedCronRequest(
      request.headers.get("authorization"),
      env.CRON_SECRET,
    )
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
    let writers: Writer[] = [];

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        writers = await prisma.writer.findMany();

        break;
      } catch (error) {
        if (attempt === 3) throw error;

        console.warn(
          `DB connect attempt ${attempt} failed, retrying: ${error instanceof Error ? error.message : String(error)}`,
        );
        await sleep(3000);
      }
    }

    console.log(`Found ${writers.length} existing writers`);

    // runErrors holds problems that mean the run did not do its job: a fetch
    // failed, or a page that always has articles parsed to none (the markup
    // changed and the selectors no longer match). Vercel Cron sees a failure
    // through the status code alone, so these turn the response into a 500.
    const allFailures: PageFailure[] = [];
    const runErrors: string[] = [];

    let newArticles = 0;
    let parsedArticles = 0;

    console.log("Processing main page");

    try {
      const main = await fetchAndProcessPage(BASE_URL, writers);

      allFailures.push(...main.failures);
      newArticles += main.newArticles;
      parsedArticles += main.parsedArticles;

      if (main.parsedArticles === 0) {
        runErrors.push(`Parsed 0 articles from ${BASE_URL}`);
      }
    } catch (error) {
      runErrors.push(
        `Failed to fetch ${BASE_URL}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    await sleep(PAGE_DELAY);

    let page = 1;
    let lastProcessedPage = 0;
    let knownPagesInARow = 0;

    while (true) {
      const pageUrl = `${BASE_URL}/newpost/page/${page}`;

      try {
        console.log(`Processing page ${page}`);

        const result = await fetchAndProcessPage(pageUrl, writers);

        allFailures.push(...result.failures);
        newArticles += result.newArticles;
        parsedArticles += result.parsedArticles;
        lastProcessedPage = page;

        if (result.articleCount === 0) {
          // The first listing page is never empty, so an empty one there means
          // the selector broke rather than that the list ended.
          if (page === 1) {
            runErrors.push(`Found 0 articles on ${pageUrl}`);
          }

          console.log(`Finished - page ${page} had no articles`);

          break;
        }

        if (result.parsedArticles === 0) {
          runErrors.push(
            `Parsed 0 of ${result.articleCount} articles on ${pageUrl}`,
          );

          break;
        }

        knownPagesInARow = result.newArticles === 0 ? knownPagesInARow + 1 : 0;

        if (knownPagesInARow >= KNOWN_PAGES_BEFORE_STOP) {
          console.log(
            `Finished - ${knownPagesInARow} pages in a row had no new articles (last: page ${page})`,
          );

          break;
        }

        page++;
        await sleep(PAGE_DELAY);
      } catch (error) {
        runErrors.push(
          `Failed to process ${pageUrl}: ${error instanceof Error ? error.message : String(error)}`,
        );

        break;
      }
    }

    const summary = {
      failedArticles: allFailures.length,
      failures: allFailures,
      lastProcessedPage,
      newArticles,
      parsedArticles,
    };

    if (runErrors.length > 0) {
      console.error("Scraping run failed:", { ...summary, errors: runErrors });

      return NextResponse.json(
        { ...summary, errors: runErrors, success: false },
        { status: 500 },
      );
    }

    console.log(
      `Scraping completed. New articles: ${newArticles}, Failed articles: ${allFailures.length}, Last page: ${lastProcessedPage}`,
    );

    return NextResponse.json({ ...summary, success: true });
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
