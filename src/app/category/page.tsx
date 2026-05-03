import prismaClient from "@/lib/prisma-client";
import { type Category, type Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import CategoryComponent from "./_components/Category";

type CategoryWithCount = Category & {
  _count: {
    articles: number;
  };
};

const MOVIE_CATEGORIES = ["オモコロチャンネル", "ふっくらすずめクラブ"];
const RADIO_CATEGORIES = ["限定ラジオ", "ラジオ"];
const getCategories = async (
  where: Prisma.CategoryWhereInput,
): Promise<CategoryWithCount[]> => {
  const categories = await prismaClient.category.findMany({
    include: {
      _count: {
        select: { articles: true },
      },
    },
    orderBy: {
      name: "asc",
    },
    where,
  });

  return categories;
};

export default async function Page(): Promise<React.JSX.Element> {
  const cookieStore = await cookies();
  const isNotOnigiri = cookieStore.get("is-not-onigiri")?.value === "true";
  const isNotMovie = cookieStore.get("is-not-movie")?.value === "true";
  const isNotRadio = cookieStore.get("is-not-radio")?.value === "true";
  const excludeNames = [
    ...(isNotMovie ? MOVIE_CATEGORIES : []),
    ...(isNotRadio ? RADIO_CATEGORIES : []),
  ];
  const where: Prisma.CategoryWhereInput = {
    ...(isNotOnigiri ? { isOnigiri: false } : {}),
    ...(excludeNames.length > 0 ? { name: { notIn: excludeNames } } : {}),
  };
  const categories = await getCategories(where);

  return <CategoryComponent categories={categories} />;
}
