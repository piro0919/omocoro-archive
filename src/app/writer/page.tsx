import { type Writer } from "@prisma/client";
import prismaClient from "@/lib/prisma-client";
import pageMetadata from "../pageMetadata";
import WriterComponent from "./_components/Writer";

export const metadata = pageMetadata({
  description:
    "オモコロに記事を書いているライターの一覧です。ライターごとの記事数から、気になる書き手を辿れます。",
  path: "/writer",
  title: "ライター一覧",
});

// 12 時間
export const revalidate = 43200;

type WriterWithCount = Writer & {
  _count: {
    articles: number;
  };
};

const getWriters = async (): Promise<WriterWithCount[]> => {
  const writers = await prismaClient.writer.findMany({
    include: {
      _count: {
        select: { articles: true },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return writers;
};

export default async function Page(): Promise<React.JSX.Element> {
  const writers = await getWriters();

  return <WriterComponent initialWriters={writers} />;
}
