import {
  arrow,
  FloatingArrow,
  useClick,
  useFloating,
  useInteractions,
} from "@floating-ui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  IconCalendar,
  IconCategory,
  IconHome,
  IconPencil,
  IconSearch,
  IconSettings,
  IconX,
} from "@tabler/icons-react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { parseAsString, useQueryState } from "nuqs";
import { type RefObject, useEffect, useRef, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useOnClickOutside } from "usehooks-ts";
import z from "zod";
import MobileDateRange from "../MobileDateRange";
import MobileSearch from "../MobileSearch";
import styles from "./style.module.css";

const schema = z.object({
  keyword: z.string(),
});

type Schema = z.infer<typeof schema>;

export default function Header(): React.JSX.Element {
  const pathname = usePathname();
  const [keyword, setKeyword] = useQueryState(
    "keyword",
    parseAsString
      .withDefault("")
      .withOptions({ history: "push", scroll: true }),
  );
  const methods = useForm<Schema>({
    defaultValues: {
      keyword,
    },
    resolver: zodResolver(schema),
  });
  const { handleSubmit, register, setValue } = methods;
  const [isOpen, setIsOpen] = useState(false);
  const arrowRef = useRef(null);
  const { context, floatingStyles, refs } = useFloating({
    middleware: [
      arrow({
        element: arrowRef,
      }),
    ],
    onOpenChange: setIsOpen,
    open: isOpen,
  });
  const click = useClick(context);
  const { getFloatingProps, getReferenceProps } = useInteractions([click]);
  const ref = useRef<HTMLDivElement>(null);
  const handleClickOutside = (): void => {
    setIsOpen(false);
  };
  const [from, setFrom] = useQueryState(
    "from",
    parseAsString
      .withDefault("")
      .withOptions({ history: "push", scroll: true }),
  );
  const [to, setTo] = useQueryState(
    "to",
    parseAsString
      .withDefault("")
      .withOptions({ history: "push", scroll: true }),
  );
  const [fromDate, setFromDate] = useState<string>(from ?? "");
  const [toDate, setToDate] = useState<string>(to ?? "");
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isMobileDateRangeOpen, setIsMobileDateRangeOpen] = useState(false);
  const ref2 = useRef<HTMLDivElement>(null);
  const ref3 = useRef<HTMLDivElement>(null);

  useOnClickOutside(ref as RefObject<HTMLElement>, handleClickOutside);
  useOnClickOutside(ref2 as RefObject<HTMLElement>, () =>
    setIsMobileSearchOpen(false),
  );
  useOnClickOutside(ref3 as RefObject<HTMLElement>, () =>
    setIsMobileDateRangeOpen(false),
  );

  useEffect(() => {
    if (isOpen || isMobileDateRangeOpen) {
      return;
    }

    setFrom(fromDate);
    setTo(toDate);
  }, [fromDate, isMobileDateRangeOpen, isOpen, setFrom, setTo, toDate]);

  useEffect(() => {
    setValue("keyword", keyword);
  }, [keyword, setValue]);

  return (
    <>
      <header className={styles.header}>
        <div className={styles.inner}>
          <motion.div
            animate={{
              scale: 1,
            }}
            initial={{
              scale: 0,
            }}
            transition={{
              delay: 0.25,
              duration: 0.25,
              ease: "backOut",
            }}
            className={styles.link}
          >
            <Link href="/">
              <div className={styles.logo}>
                <Image
                  alt="オモコロアーカイブ"
                  height={184}
                  src="/logo.png"
                  width={1220}
                />
              </div>
            </Link>
          </motion.div>
          {pathname === "/" ? (
            <form
              // eslint-disable-next-line @typescript-eslint/no-misused-promises
              onSubmit={handleSubmit((data) => {
                setKeyword(data.keyword.replace(/\s+/g, " ").trim());
              })}
              className={styles.form}
            >
              <div className={styles.searchContainer}>
                <input
                  {...register("keyword")}
                  className={styles.searchInput}
                  placeholder="記事を検索"
                  type="text"
                />
                <button
                  onClick={() => {
                    setKeyword("");
                  }}
                  aria-label="検索語を消す"
                  className={styles.clearButton}
                  disabled={!keyword}
                  type="button"
                >
                  <IconX size={18} />
                </button>
                <button
                  aria-label="検索する"
                  className={styles.submitButton}
                  type="submit"
                >
                  <IconSearch size={18} />
                </button>
              </div>
            </form>
          ) : null}
          {pathname === "/" ? (
            <div className={styles.buttons}>
              <button
                aria-label="検索を開く"
                className={styles.searchButton}
                onClick={() => setIsMobileSearchOpen(true)}
              >
                <IconSearch size={21} />
              </button>
              <div ref={ref}>
                <button
                  aria-label="日付で絞り込む"
                  className={styles.mobileCalendarButton}
                  onClick={() => setIsMobileDateRangeOpen(true)}
                >
                  <IconCalendar size={21} />
                </button>
                <button
                  aria-label="日付で絞り込む"
                  className={styles.calendarButton}
                  ref={refs.setReference}
                  {...getReferenceProps()}
                >
                  <IconCalendar size={21} />
                </button>
                {isOpen ? (
                  <div
                    ref={refs.setFloating}
                    style={floatingStyles}
                    {...getFloatingProps()}
                    className={styles.floating}
                  >
                    <FloatingArrow
                      context={context}
                      fill="hsl(from var(--card) h s l)"
                      ref={arrowRef}
                      stroke="hsl(from var(--border) h s l)"
                      strokeWidth={1}
                    />
                    <input
                      aria-label="開始日"
                      className={styles.input}
                      onChange={(e) => setFromDate(e.target.value)}
                      type="date"
                      value={fromDate}
                    />
                    <span className={styles.separator}>〜</span>
                    <input
                      aria-label="終了日"
                      className={styles.input}
                      onChange={(e) => setToDate(e.target.value)}
                      type="date"
                      value={toDate}
                    />
                    <button
                      onClick={() => {
                        setFromDate("");
                        setToDate("");
                      }}
                      aria-label="日付の絞り込みを消す"
                      className={styles.clearButton2}
                      disabled={!fromDate && !toDate}
                      type="button"
                    >
                      <IconX size={18} />
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
          <nav className={styles.nav}>
            <Link
              className={`${styles.navLink} ${pathname === "/" ? styles.navLinkActive : ""}`}
              href="/"
            >
              <IconHome size={18} />
              <span className={styles.navLinkText}>ホーム</span>
            </Link>
            <Link
              className={`${styles.navLink} ${pathname === "/writer" ? styles.navLinkActive : ""}`}
              href="/writer"
            >
              <IconPencil size={18} />
              <span className={styles.navLinkText}>ライター</span>
            </Link>
            <Link
              className={`${styles.navLink} ${pathname === "/category" ? styles.navLinkActive : ""}`}
              href="/category"
            >
              <IconCategory size={18} />
              <span className={styles.navLinkText}>カテゴリー</span>
            </Link>
            <Link
              className={`${styles.navLink} ${pathname === "/settings" ? styles.navLinkActive : ""}`}
              href="/settings"
            >
              <IconSettings size={18} />
              <span className={styles.navLinkText}>設定</span>
            </Link>
          </nav>
        </div>
        {pathname === "/" ? (
          <motion.div
            transition={{
              ease: "easeInOut",
            }}
            variants={{
              active: {
                y: -60,
              },
              inactive: {
                y: -120,
              },
            }}
            animate={isMobileSearchOpen ? "active" : "inactive"}
            className={styles.mobileSearch}
            initial="inactive"
            ref={ref2}
          >
            <FormProvider {...methods}>
              <MobileSearch
                isMobileSearchOpen={isMobileSearchOpen}
                onClose={() => setIsMobileSearchOpen(false)}
              />
            </FormProvider>
          </motion.div>
        ) : null}
        {pathname === "/" ? (
          <motion.div
            transition={{
              ease: "easeInOut",
            }}
            variants={{
              active: {
                y: -60,
              },
              inactive: {
                y: -120,
              },
            }}
            animate={isMobileDateRangeOpen ? "active" : "inactive"}
            className={styles.mobileDateRange}
            initial="inactive"
            ref={ref3}
          >
            <MobileDateRange
              fromDate={fromDate}
              onClose={() => setIsMobileDateRangeOpen(false)}
              setFromDate={setFromDate}
              setToDate={setToDate}
              toDate={toDate}
            />
          </motion.div>
        ) : null}
      </header>
    </>
  );
}
