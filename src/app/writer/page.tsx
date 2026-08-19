import { type Writer } from "@prisma/client";
import prismaClient from "@/lib/prisma-client";
import WriterComponent from "./_components/Writer";

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
