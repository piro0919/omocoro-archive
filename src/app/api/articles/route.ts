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
  const category = searchParams.get("category");
  const from = searchParams.get("from");
  const isNotMovie = searchParams.get("isNotMovie");
  const isNotOnigiri = searchParams.get("isNotOnigiri");
  const isNotRadio = searchParams.get("isNotRadio");
  const keyword = searchParams.get("keyword");
  const limit = searchParams.get("limit");
  const order = searchParams.get("order");
  const page = searchParams.get("page");
  const to = searchParams.get("to");
  const writer = searchParams.get("writer");
  const excludeCategories = [
    ...(isNotMovie === "true"
      ? ["オモコロチャンネル", "ふっくらすずめクラブ"]
      : []),
    ...(isNotRadio === "true" ? ["限定ラジオ", "ラジオ"] : []),
  ];
  const articles = await prismaClient.article.findMany({
    include: {
      category: true,
      writers: true,
    },
    orderBy: {
      publishedAt: (order as "asc" | "desc") ?? "desc",
    },
    skip: page ? parseInt(page) * parseInt(limit || "24") : 0,
    take: parseInt(limit || "24"),
    where: {
      AND: [
        ...[
          {
            category: {
              isOnigiri: isNotOnigiri === "true" ? false : undefined,
            },
          },
        ],
        ...[
          {
            category: {
              name: category || undefined,
            },
          },
        ],
        ...[
          {
            category: {
              name:
                excludeCategories.length > 0
                  ? { notIn: excludeCategories }
                  : undefined,
            },
          },
        ],
        ...(keyword || "").split(" ").map((v) => ({
          title: {
            contains: v,
            mode: "insensitive" as const,
          },
        })),
        ...[
          {
            publishedAt: {
              gte: from ? new Date(from) : undefined,
              lte: to ? new Date(to) : undefined,
            },
          },
        ],
        ...[
          {
            writers: {
              some: {
                name: writer || undefined,
              },
            },
          },
        ],
      ],
    },
  });

  return NextResponse.json(articles);
}
