import {
  buildArticleWhere,
  parseOrder,
  parsePagination,
  readFilterParams,
} from "@/lib/article-filters";
import prismaClient from "@/lib/prisma-client";
import { type Article, type Category, type Writer } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";

// eslint-disable-next-line import/prefer-default-export
export async function GET(
  request: NextRequest,
): Promise<
  NextResponse<(Article & { category: Category; writers: Writer[] })[]>
> {
  const { searchParams } = new URL(request.url);
  const params = readFilterParams(searchParams);
  const { skip, take } = parsePagination(searchParams);
  const order = parseOrder(searchParams);
  const articles = await prismaClient.article.findMany({
    include: {
      category: true,
      writers: true,
    },
    orderBy: {
      publishedAt: order,
    },
    skip,
    take,
    where: buildArticleWhere(params),
  });

  return NextResponse.json(articles, {
    headers: {
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
    },
  });
}
