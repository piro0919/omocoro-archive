import { type Writer } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import prismaClient from "@/lib/prisma-client";

type WriterWithCount = Writer & {
  _count: {
    articles: number;
  };
};

// eslint-disable-next-line import/prefer-default-export
export async function GET(
  request: NextRequest,
): Promise<NextResponse<WriterWithCount[]>> {
  const { searchParams } = new URL(request.url);
  const isNotMovie = searchParams.get("isNotMovie");
  const isNotOnigiri = searchParams.get("isNotOnigiri");
  const isNotRadio = searchParams.get("isNotRadio");
  const excludeCategories = [
    ...(isNotMovie === "true"
      ? ["オモコロチャンネル", "ふっくらすずめクラブ"]
      : []),
    ...(isNotRadio === "true" ? ["限定ラジオ", "ラジオ"] : []),
  ];
  const writers = await prismaClient.writer.findMany({
    include: {
      _count: {
        select: {
          articles: {
            where: {
              category: {
                isOnigiri: isNotOnigiri === "true" ? false : undefined,
                name:
                  excludeCategories.length > 0
                    ? { notIn: excludeCategories }
                    : undefined,
              },
            },
          },
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return NextResponse.json(writers);
}
