import { useScrollPosition } from "@n8tb1t/use-scroll-position";
import useSwitch from "@react-hook/switch";
import { useWindowHeight } from "@react-hook/window-size";
import axios from "axios";
import dayjs from "dayjs";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import queryString from "query-string";
import {
  ChangeEventHandler,
  CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import useOnclickOutside from "react-cool-onclickoutside";
import { SubmitHandler, useForm } from "react-hook-form";
import {
  FaCaretDown,
  FaCaretUp,
  FaLongArrowAltDown,
  FaRegTimesCircle,
  FaSearch,
} from "react-icons/fa";
import InfiniteScroll, { Props } from "react-infinite-scroll-component";
import Loader from "react-loader-spinner";
import useSWRInfinite from "swr/infinite";
import logo from "./images/logo.png";
import styles from "./style.module.scss";

type FieldValues = {
  from: string;
  isNewOrder: boolean;
  query: string;
  until: string;
};

type Article = {
  category: string;
  date: string;
  image: string;
  staffs: string[];
  title: string;
  url: string;
};

type Data = {
  articles: Article[];
  total: number;
};

export type TopProps = {
  articles: Article[];
  onSubmit: SubmitHandler<FieldValues>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fetcher = (url: string): Promise<any> =>
  axios.get(`/api${url}`).then(({ data }) => [data]);
const getKey = (
  pageIndex: number,
  previousPageData: Article[]
): string | null => {
  if (previousPageData && !previousPageData.length) {
    return null;
  }

  const {
    location: { search },
  } = window;
  const { from, order, query, staffs, until } = queryString.parse(search);

  return `/articles?${queryString.stringify(
    {
      query,
      "fields.date[gte]":
        typeof from === "string"
          ? dayjs(from).add(-1, "day").format("YYYY-MM-DD")
          : undefined,
      "fields.date[lte]":
        typeof until === "string"
          ? dayjs(until).format("YYYY-MM-DD")
          : undefined,
      "fields.staffs": staffs,
      limit: 24,
      order: typeof order === "string" ? order : "-fields.date",
      skip: 24 * pageIndex,
    },
    { skipEmptyString: true }
  )}`;
};

function Top({ articles, onSubmit }: TopProps): JSX.Element {
  const { query: routerQuery, ...router } = useRouter();
  const { from, order, query, staffs, until } = useMemo(
    () => routerQuery,
    [routerQuery]
  );
  const { data, isValidating, setSize, size } = useSWRInfinite<Data[]>(
    getKey,
    fetcher,
    {
      fallbackData: Object.keys(routerQuery).length
        ? []
        : [[{ articles, total: 0 }]],
      revalidateFirstPage: false,
      revalidateOnFocus: false,
    }
  );
  const total = useMemo(() => {
    if (!data || !data[0]) {
      return undefined;
    }

    const { total } = data[0][0];

    return total;
  }, [data]);
  const items = useMemo(
    () =>
      (data || []).flat().map(({ articles }) =>
        articles.map(({ category, date, image, staffs, title, url }) => {
          let categoryClassName = "";

          switch (category) {
            case "4コマ": {
              categoryClassName = styles.fourFrame;

              break;
            }
            case "連載":
            case "ラジオ": {
              categoryClassName = styles.radio;

              break;
            }
            case "動画": {
              categoryClassName = styles.video;

              break;
            }
            case "ジモコロ": {
              categoryClassName = styles.jimocoro;

              break;
            }
            case "おにぎりクラブ限定":
            case "限定コラム":
            case "ビジネス会議": {
              categoryClassName = styles.onigiri;

              break;
            }
            case "ブロス記事広告":
            case "ブロス": {
              categoryClassName = styles.bros;

              break;
            }
            case "特集": {
              categoryClassName = styles.specialFeature;

              break;
            }
            case "記事広告": {
              categoryClassName = styles.advertorial;

              break;
            }
            case "お知らせ": {
              categoryClassName = styles.notice;

              break;
            }
            case "まとめ": {
              categoryClassName = styles.summary;

              break;
            }
          }

          return (
            <div className={styles.item} key={url}>
              <Link href={url}>
                <a target="_blank">
                  <div className={styles.thumbnailWrapper}>
                    <Image
                      alt={title}
                      layout="fill"
                      objectFit="cover"
                      src={image}
                    />
                  </div>
                </a>
              </Link>
              <div className={styles.detailWrapper}>
                <div className={`${styles.categoryText} ${categoryClassName}`}>
                  {category}
                </div>
                <div className={styles.dateText}>
                  {dayjs(date).format("YYYY.MM.DD")}
                </div>
                <Link href={url}>
                  <a className={styles.heading2Anchor} target="_blank">
                    <h2 className={styles.heading2}>{title}</h2>
                  </a>
                </Link>
                {staffs ? (
                  <ul className={styles.staffList}>
                    {staffs.map((staff) => (
                      <li key={staff}>
                        <Link
                          href={{
                            pathname: "/",
                            query: {
                              ...routerQuery,
                              staffs: staff,
                            },
                          }}
                          shallow={true}
                        >
                          <a className={styles.staffAnchor}>{staff}</a>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          );
        })
      ),
    [data, routerQuery]
  );
  const [headerClassName, setHeaderClassName] = useState("");
  const next = useCallback<Props["next"]>(() => {
    setSize(size + 1);
  }, [setSize, size]);
  const { handleSubmit, register, reset, setValue, watch } =
    useForm<FieldValues>({
      defaultValues: { from: "", isNewOrder: true, query: "", until: "" },
    });
  const [isOpenMenu, toggleMenu] = useSwitch(false);
  const ref = useOnclickOutside(() => {
    toggleMenu.off();
  });
  const onlyHeight = useWindowHeight();
  const [style, setStyle] = useState<CSSProperties>();
  const handleChange = useCallback<ChangeEventHandler<HTMLInputElement>>(
    ({ currentTarget: { checked } }) => {
      setValue("isNewOrder", checked);

      handleSubmit(onSubmit)();
    },
    [handleSubmit, onSubmit, setValue]
  );

  useScrollPosition(({ currPos: { y } }) => {
    setHeaderClassName(y < 0 ? styles.narrowHeader : "");
  });

  useEffect(() => {
    if (Array.isArray(query)) {
      reset({
        query: query.join(" "),
      });

      return;
    }

    setValue("query", query || "");
  }, [query, reset, setValue]);

  useEffect(() => {
    setValue(
      "isNewOrder",
      typeof order === "undefined" || order === "-fields.date"
    );
  }, [order, query, reset, setValue]);

  useEffect(() => {
    setValue("from", typeof from === "string" ? from : "");
  }, [from, order, query, reset, setValue]);

  useEffect(() => {
    setValue("until", typeof until === "string" ? until : "");
  }, [order, query, reset, setValue, until]);

  useEffect(() => {
    setStyle({ minHeight: `${onlyHeight}px` });
  }, [onlyHeight]);

  useEffect(() => {
    toggleMenu.off();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routerQuery]);

  return (
    <div className={styles.wrapper} style={style}>
      <header className={`${styles.header} ${headerClassName}`} ref={ref}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className={styles.headerInner}>
            <Link href="/" shallow={true}>
              <a className={styles.logoAnchor}>
                <h1 className={styles.heading1}>オモコロアーカイブ</h1>
                <Image alt="オモコロアーカイブ" layout="fill" src={logo} />
              </a>
            </Link>
            <label className={styles.sortLabel}>
              <input
                {...register("isNewOrder")}
                className={styles.checkbox}
                onChange={handleChange}
                type="checkbox"
              />
              {watch("isNewOrder") ? "新 → 旧" : "旧 → 新"}
              <FaLongArrowAltDown />
            </label>
            <button
              className={styles.filterButton}
              onClick={toggleMenu}
              type="button"
            >
              絞り込み
              {isOpenMenu ? <FaCaretUp /> : <FaCaretDown />}
            </button>
            <div className={styles.formInner}>
              <input {...register("query")} className={styles.input} />
              <button className={styles.searchButton} type="submit">
                <FaSearch className={styles.searchIcon} />
              </button>
            </div>
          </div>
          <div
            className={`${styles.filterWrapper} ${
              isOpenMenu ? styles.open : ""
            }`}
          >
            <div className={styles.filterInner}>
              <div className={styles.dateRangeWrapper}>
                <input
                  {...register("from")}
                  className={styles.dateInput}
                  max={dayjs().format("YYYY-MM-DD")}
                  min={dayjs("2005-10-19").format("YYYY-MM-DD")}
                  type="date"
                />
                〜
                <input
                  {...register("until")}
                  className={styles.dateInput}
                  max={dayjs().format("YYYY-MM-DD")}
                  min={dayjs("2005-10-19").format("YYYY-MM-DD")}
                  type="date"
                />
              </div>
              <button className={styles.searchButton2}>
                表示する
                <FaSearch />
              </button>
            </div>
          </div>
        </form>
      </header>
      <main>
        <div className={styles.mainInner}>
          <div className={styles.searchWordWrapper}>
            {typeof total === "number" ? `${total.toLocaleString()} 件` : null}
            {typeof staffs === "undefined" ? null : (
              <div className={styles.staffsWrapper}>
                {staffs}
                <button
                  className={styles.closeButton}
                  onClick={(): void => {
                    router.push(
                      {
                        pathname: "/",
                        query: queryString.stringify(
                          {
                            ...routerQuery,
                            staffs: undefined,
                          },
                          {
                            skipEmptyString: true,
                          }
                        ),
                      },
                      undefined,
                      {
                        shallow: true,
                      }
                    );
                  }}
                >
                  <FaRegTimesCircle />
                </button>
              </div>
            )}
            <div className={styles.dateRangeWrapper2}>
              {typeof from === "string" ? (
                <div className={styles.dateWrapper}>
                  {dayjs(from).format("YYYY/MM/DD")}
                  <button
                    className={styles.closeButton}
                    onClick={(): void => {
                      router.push(
                        {
                          pathname: "/",
                          query: queryString.stringify(
                            {
                              ...routerQuery,
                              from: undefined,
                            },
                            {
                              skipEmptyString: true,
                            }
                          ),
                        },
                        undefined,
                        {
                          shallow: true,
                        }
                      );
                    }}
                  >
                    <FaRegTimesCircle />
                  </button>
                </div>
              ) : null}
              {typeof from === "string" || typeof until === "string"
                ? "〜"
                : null}
              {typeof until === "string" ? (
                <div className={styles.dateWrapper}>
                  {dayjs(until).format("YYYY/MM/DD")}
                  <button
                    className={styles.closeButton}
                    onClick={(): void => {
                      router.push(
                        {
                          pathname: "/",
                          query: queryString.stringify(
                            {
                              ...routerQuery,
                              until: undefined,
                            },
                            {
                              skipEmptyString: true,
                            }
                          ),
                        },
                        undefined,
                        {
                          shallow: true,
                        }
                      );
                    }}
                  >
                    <FaRegTimesCircle />
                  </button>
                </div>
              ) : null}
            </div>
          </div>
          {items.length ? (
            <InfiniteScroll
              className={styles.list}
              dataLength={items.length}
              hasMore={!!total && total > items.length}
              key={queryString.stringify(routerQuery)}
              loader={
                <div className={styles.loaderWrapper}>
                  <Loader color="#fff" height={36} type="TailSpin" width={36} />
                </div>
              }
              next={next}
            >
              {items}
            </InfiniteScroll>
          ) : isValidating ? null : (
            <p>検索ワード一致する情報は見つかりませんでした。</p>
          )}
        </div>
      </main>
      <footer className={styles.footer}>
        <div className={styles.footerInner}>&copy; 2021 オモコロアーカイブ</div>
      </footer>
    </div>
  );
}

export default Top;
