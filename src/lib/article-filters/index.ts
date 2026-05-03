import { type Prisma } from "@prisma/client";

const MOVIE_CATEGORIES = ["オモコロチャンネル", "ふっくらすずめクラブ"];
const RADIO_CATEGORIES = ["限定ラジオ", "ラジオ"];

export type ArticleFilterParams = {
  category: null | string;
  from: null | string;
  isNotMovie: null | string;
  isNotOnigiri: null | string;
  isNotRadio: null | string;
  keyword: null | string;
  to: null | string;
  writer: null | string;
};

export function readFilterParams(
  searchParams: URLSearchParams,
): ArticleFilterParams {
  return {
    category: searchParams.get("category"),
    from: searchParams.get("from"),
    isNotMovie: searchParams.get("isNotMovie"),
    isNotOnigiri: searchParams.get("isNotOnigiri"),
    isNotRadio: searchParams.get("isNotRadio"),
    keyword: searchParams.get("keyword"),
    to: searchParams.get("to"),
    writer: searchParams.get("writer"),
  };
}

// An explicit category selection takes precedence: even if "movie hidden" is
// on, picking the movie category should show its articles. Otherwise the UI
// surfaces the category, the user clicks it, and gets zero results.
export function buildArticleWhere(
  params: ArticleFilterParams,
): Prisma.ArticleWhereInput {
  const {
    category,
    from,
    isNotMovie,
    isNotOnigiri,
    isNotRadio,
    keyword,
    to,
    writer,
  } = params;
  const hasExplicitCategory = Boolean(category);
  const excludeCategoryNames = hasExplicitCategory
    ? []
    : [
        ...(isNotMovie === "true" ? MOVIE_CATEGORIES : []),
        ...(isNotRadio === "true" ? RADIO_CATEGORIES : []),
      ];
  const categoryConditions: Prisma.CategoryWhereInput = {
    ...(category ? { name: category } : {}),
    ...(excludeCategoryNames.length > 0
      ? { name: { notIn: excludeCategoryNames } }
      : {}),
    ...(isNotOnigiri === "true" && !hasExplicitCategory
      ? { isOnigiri: false }
      : {}),
  };
  const where: Prisma.ArticleWhereInput = {};

  if (Object.keys(categoryConditions).length > 0) {
    where.category = categoryConditions;
  }

  if (keyword) {
    where.AND = keyword
      .split(" ")
      .filter((word) => word.length > 0)
      .map((word) => ({
        title: { contains: word, mode: "insensitive" as const },
      }));
  }

  if (from || to) {
    where.publishedAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }

  if (writer) {
    where.writers = { some: { name: writer } };
  }

  return where;
}

export function parsePagination(searchParams: URLSearchParams): {
  skip: number;
  take: number;
} {
  const rawLimit = parseInt(searchParams.get("limit") ?? "24", 10);
  const rawPage = parseInt(searchParams.get("page") ?? "0", 10);
  const take =
    Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 24;
  const page = Number.isFinite(rawPage) && rawPage >= 0 ? rawPage : 0;

  return { skip: page * take, take };
}

export function parseOrder(searchParams: URLSearchParams): "asc" | "desc" {
  const value = searchParams.get("order");

  return value === "asc" ? "asc" : "desc";
}
