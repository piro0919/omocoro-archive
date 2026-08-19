import { type Article, type Category, type Writer } from "@prisma/client";
import { Suspense } from "react";
import prismaClient from "@/lib/prisma-client";
import App from "./_components/App";

// 12 時間
export const revalidate = 43200;

async function getArticles(): Promise<
  (Article & { category: Category; writers: Writer[] })[]
> {
  const articles = await prismaClient.article.findMany({
    include: {
      category: true,
      writers: true,
    },
    orderBy: {
      publishedAt: "desc" as const,
    },
    skip: 0,
    take: 24,
  });

  return articles;
}

export default async function Page(): Promise<React.JSX.Element> {
  const articles = await getArticles();

  return (
    <Suspense>
      <App initialArticles={articles} />
    </Suspense>
  );
}
