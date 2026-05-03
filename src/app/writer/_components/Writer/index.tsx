"use client";
import { type Writer } from "@prisma/client";
import { useGetCookie } from "cookies-next/client";
import Image from "next/image";
import Link from "next/link";
import queryString from "query-string";
import { useState } from "react";
import { TailSpin } from "react-loader-spinner";
import useSWR from "swr";
import styles from "./style.module.css";

type WriterWithCount = Writer & {
  _count: {
    articles: number;
  };
};

export type WriterProps = Readonly<{
  initialWriters: WriterWithCount[];
}>;

export default function Writer({
  initialWriters,
}: WriterProps): React.JSX.Element {
  const [order, setOrder] = useState<"count" | "name">("name");
  const getCookie = useGetCookie();
  const isNotOnigiri = getCookie("is-not-onigiri");
  const isNotMovie = getCookie("is-not-movie");
  const isNotRadio = getCookie("is-not-radio");
  const { data: writers = [], isValidating } = useSWR<WriterWithCount[]>(
    queryString.stringifyUrl({
      query: {
        isNotMovie: isNotMovie ?? "false",
        isNotOnigiri: isNotOnigiri ?? "false",
        isNotRadio: isNotRadio ?? "false",
      },
      url: "/api/writers",
    }),
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        {isValidating ? (
          <TailSpin
            color="#fe0000"
            height={24}
            radius="2"
            visible={true}
            width={24}
          />
        ) : (
          <div />
        )}
        <div className={styles.buttons}>
          <button
            className={styles.button}
            disabled={order === "name"}
            onClick={() => setOrder("name")}
          >
            名前順
          </button>
          <button
            className={styles.button}
            disabled={order === "count"}
            onClick={() => setOrder("count")}
          >
            記事数順
          </button>
        </div>
      </div>
      <ul className={styles.list}>
        {[...(writers.length > 0 || !isValidating ? writers : initialWriters)]
          .sort((a, b) => {
            if (order === "name") {
              return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
            }

            // 記事数が同じ場合は名前順でソート（安定ソート）
            if (b._count.articles === a._count.articles) {
              return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
            }

            return b._count.articles - a._count.articles;
          })
          .map((writer) => (
            <li className={styles.item} key={writer.id}>
              <Link className={styles.link} href={`/?writer=${writer.name}`}>
                <div className={styles.imageContainer}>
                  <Image
                    alt={writer.name}
                    className={styles.image}
                    decoding="async"
                    fill={true}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    src={writer.avatarUrl}
                  />
                </div>
                <div className={styles.name}>{writer.name}</div>
                <div className={styles.count}>
                  {writer._count.articles.toLocaleString()} 本
                </div>
              </Link>
            </li>
          ))}
      </ul>
    </div>
  );
}
