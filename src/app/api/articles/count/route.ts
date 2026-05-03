import { buildArticleWhere, readFilterParams } from "@/lib/article-filters";
import prismaClient from "@/lib/prisma-client";
import { type NextRequest, NextResponse } from "next/server";

// eslint-disable-next-line import/prefer-default-export
export async function GET(request: NextRequest): Promise<NextResponse<number>> {
  const { searchParams } = new URL(request.url);
  const where = buildArticleWhere(readFilterParams(searchParams));
  const count = await prismaClient.article.count({ where });

  return NextResponse.json(count, {
    headers: {
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
    },
  });
}
