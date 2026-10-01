import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  type ArticleFilterParams,
  buildArticleWhere,
  parseDateParam,
} from "@/lib/article-filters";

const empty: ArticleFilterParams = {
  category: null,
  from: null,
  isNotMovie: null,
  isNotOnigiri: null,
  isNotRadio: null,
  keyword: null,
  to: null,
  writer: null,
};

describe("parseDateParam", () => {
  test("returns null for missing or empty values", () => {
    assert.equal(parseDateParam(null), null);
    assert.equal(parseDateParam(""), null);
  });

  test("returns null for values that are not dates", () => {
    assert.equal(parseDateParam("abc"), null);
    assert.equal(parseDateParam("2024-13-45"), null);
  });

  test("parses ISO dates", () => {
    assert.deepEqual(
      parseDateParam("2024-01-02"),
      new Date("2024-01-02T00:00:00.000Z"),
    );
  });
});

describe("buildArticleWhere", () => {
  test("returns an empty filter when nothing is set", () => {
    assert.deepEqual(buildArticleWhere(empty), {});
  });

  test("drops invalid dates instead of passing Invalid Date to Prisma", () => {
    assert.deepEqual(
      buildArticleWhere({ ...empty, from: "abc", to: "xyz" }),
      {},
    );
  });

  test("keeps the valid side of a half-invalid range", () => {
    assert.deepEqual(
      buildArticleWhere({ ...empty, from: "abc", to: "2024-01-31" }),
      { publishedAt: { lte: new Date("2024-01-31") } },
    );
  });

  test("builds a date range", () => {
    assert.deepEqual(
      buildArticleWhere({ ...empty, from: "2024-01-01", to: "2024-01-31" }),
      {
        publishedAt: {
          gte: new Date("2024-01-01"),
          lte: new Date("2024-01-31"),
        },
      },
    );
  });

  test("splits the keyword into AND conditions", () => {
    assert.deepEqual(buildArticleWhere({ ...empty, keyword: "a  b" }), {
      AND: [
        { title: { contains: "a", mode: "insensitive" } },
        { title: { contains: "b", mode: "insensitive" } },
      ],
    });
  });

  test("excludes movie and radio categories when asked", () => {
    assert.deepEqual(
      buildArticleWhere({ ...empty, isNotMovie: "true", isNotRadio: "true" }),
      {
        category: {
          name: {
            notIn: [
              "オモコロチャンネル",
              "ふっくらすずめクラブ",
              "限定ラジオ",
              "ラジオ",
            ],
          },
        },
      },
    );
  });

  test("an explicit category wins over the hide toggles", () => {
    assert.deepEqual(
      buildArticleWhere({
        ...empty,
        category: "オモコロチャンネル",
        isNotMovie: "true",
        isNotOnigiri: "true",
      }),
      { category: { name: "オモコロチャンネル" } },
    );
  });

  test("filters by writer", () => {
    assert.deepEqual(buildArticleWhere({ ...empty, writer: "ARuFa" }), {
      writers: { some: { name: "ARuFa" } },
    });
  });
});
