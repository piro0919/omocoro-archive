"use client";
import fetcher from "@/lib/fetcher";
import { type Article, type Category, type Writer } from "@prisma/client";
import { useGetCookie } from "cookies-next/client";
import { format } from "date-fns";
import Image from "next/image";
import { parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";
import queryString from "query-string";
import React, { useEffect, useMemo, useRef } from "react";
import LinesEllipsis from "react-lines-ellipsis";
import { TailSpin } from "react-loader-spinner";
import useSWR from "swr";
import useSWRInfinite from "swr/infinite";
import { useWindowSize } from "usehooks-ts";
import styles from "./style.module.css";

const getArticlesKey =
  ({
    category,
    from,
    isNotMovie,
    isNotOnigiri,
    isNotRadio,
    keyword,
    order,
    to,
    writer,
  }: {
    category: string;
    from: string;
    isNotMovie: string;
    isNotOnigiri: string;
    isNotRadio: string;
    keyword: string;
    order: string;
    to: string;
    writer: string;
  }) =>
  (
    pageIndex: number,
    previousPageData: (Article & { category: Category; writers: Writer[] })[],
  ): null | string => {
    if (previousPageData && !previousPageData.length) {
      return null;
    }

    return queryString.stringifyUrl({
      query: {
        category,
        from,
        isNotMovie,
        isNotOnigiri,
        isNotRadio,
        keyword,
        limit: 24,
        order,
        page: pageIndex,
        to,
        writer,
      },
      url: "/api/articles",
    });
  };
const getArticlesCountKey =
  ({
    category,
    from,
    isNotMovie,
    isNotOnigiri,
    isNotRadio,
    keyword,
    to,
    writer,
  }: {
    category: string;
    from: string;
    isNotMovie: string;
    isNotOnigiri: string;
    isNotRadio: string;
    keyword: string;
    to: string;
    writer: string;
  }) =>
  (): null | string => {
    return queryString.stringifyUrl({
      query: {
        category,
        from,
        isNotMovie,
        isNotOnigiri,
        isNotRadio,
        keyword,
        to,
        writer,
      },
      url: "/api/articles/count",
    });
  };

export type AppProps = Readonly<{
  initialArticles: (Article & { category: Category; writers: Writer[] })[];
}>;

export default function App({ initialArticles }: AppProps): React.JSX.Element {
  const [category, setCategory] = useQueryState(
    "category",
    parseAsString
      .withDefault("")
      .withOptions({ history: "push", scroll: true }),
  );
  const [keyword] = useQueryState("keyword", parseAsString.withDefault(""));
  const [order, setOrder] = useQueryState("order", {
    ...parseAsStringLiteral(["asc", "desc"]).withDefault("desc"),
    clearOnDefault: false,
    history: "push",
    scroll: true,
  });
  const [writer, setWriter] = useQueryState(
    "writer",
    parseAsString
      .withDefault("")
      .withOptions({ history: "push", scroll: true }),
  );
  const [from] = useQueryState("from", parseAsString.withDefault(""));
  const [to] = useQueryState("to", parseAsString.withDefault(""));
  const getCookie = useGetCookie();
  const isNotOnigiri = getCookie("is-not-onigiri");
  const isNotMovie = getCookie("is-not-movie");
  const isNotRadio = getCookie("is-not-radio");
  const {
    data: articles = [],
    isLoading,
    isValidating,
    setSize,
    size,
  } = useSWRInfinite<(Article & { category: Category; writers: Writer[] })[]>(
    getArticlesKey({
      category,
      from,
      isNotMovie: isNotMovie ?? "false",
      isNotOnigiri: isNotOnigiri ?? "false",
      isNotRadio: isNotRadio ?? "false",
      keyword,
      order,
      to,
      writer,
    }),
    fetcher,
    {
      revalidateFirstPage: false,
    },
  );
  const { data: articlesCount = 0 } = useSWR<number>(
    getArticlesCountKey({
      category,
      from,
      isNotMovie: isNotMovie ?? "false",
      isNotOnigiri: isNotOnigiri ?? "false",
      isNotRadio: isNotRadio ?? "false",
      keyword,
      to,
      writer,
    }),
  );
  const { width } = useWindowSize();
  const flatArticles = useMemo(() => articles.flat(), [articles]);
  const isLoadingMore =
    isLoading || (size > 0 && articles[size - 1] === undefined);
  const lastPage = articles.at(-1);
  const reachedEnd =
    lastPage !== undefined && (lastPage.length === 0 || lastPage.length < 24);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(isLoadingMore);

  loadingRef.current = isLoadingMore;

  useEffect(() => {
    const node = sentinelRef.current;

    if (!node || reachedEnd) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !loadingRef.current) {
          setSize((prev) => prev + 1);
        }
      },
      { rootMargin: "1200px 0px" },
    );

    observer.observe(node);

    return (): void => {
      observer.disconnect();
    };
  }, [reachedEnd, setSize]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.texts}>
          {isLoading || isValidating ? (
            <TailSpin
              color="#fe0000"
              height={24}
              radius="2"
              visible={true}
              width={24}
            />
          ) : null}
          <div
            className={styles.count}
          >{`${articlesCount.toLocaleString()}件`}</div>
          <div className={styles.metaButtons}>
            {category ? (
              <button
                onClick={() => {
                  setCategory(null);
                }}
                className={styles.button}
              >
                {category}
              </button>
            ) : null}
            {writer ? (
              <button
                onClick={() => {
                  setWriter(null);
                }}
                className={styles.button}
              >
                {writer}
              </button>
            ) : null}
          </div>
        </div>
        <div className={styles.buttons}>
          <button
            onClick={() => {
              setOrder("desc");
            }}
            className={styles.button}
            disabled={order === "desc"}
          >
            新しい順
          </button>
          <button
            onClick={() => {
              setOrder("asc");
            }}
            className={styles.button}
            disabled={order === "asc"}
          >
            古い順
          </button>
        </div>
      </div>
      <ul className={styles.list}>
        {(flatArticles.length > 0 || !isValidating
          ? flatArticles
          : initialArticles
        ).map((article) => (
          <li className={styles.item} key={article.id}>
            <a
              className={styles.link}
              href={article.url}
              rel="noopener noreferrer"
              target="_blank"
            >
              <div className={styles.thumbnail}>
                <Image
                  alt={article.title}
                  className={styles.image}
                  fill={true}
                  src={article.thumbnail}
                />
              </div>
              <div className={styles.detail}>
                <div className={styles.title}>
                  <LinesEllipsis
                    basedOn="letters"
                    ellipsis="..."
                    maxLine="2"
                    text={article.title}
                    trimRight={true}
                    winWidth={width}
                  />
                </div>
                <div className={styles.meta}>
                  <div className={styles.metaButtons}>
                    <button
                      onClick={(e) => {
                        e.preventDefault();

                        setCategory(
                          article.category.name === category
                            ? null
                            : article.category.name,
                        );
                      }}
                      className={styles.category}
                    >
                      {article.category.name}
                    </button>
                    {article.writers
                      .map((writer) => writer.name)
                      .map((name) => (
                        <button
                          onClick={(e) => {
                            e.preventDefault();

                            setWriter(name === writer ? null : name);
                          }}
                          className={styles.writer}
                          key={name}
                        >
                          {name}
                        </button>
                      ))}
                  </div>
                  <div className={styles.publishedAt}>
                    {article.publishedAt
                      ? format(article.publishedAt, "yyyy.MM.dd")
                      : ""}
                  </div>
                </div>
              </div>
            </a>
          </li>
        ))}
      </ul>
      <div aria-hidden="true" ref={sentinelRef} />
      {reachedEnd && !isValidating && !isLoading ? (
        <p className={styles.completed}>すべての記事を読み込みました</p>
      ) : (
        <TailSpin
          color="#fe0000"
          height={24}
          radius="2"
          visible={true}
          width={24}
        />
      )}
    </div>
  );
}
