import { IconArrowLeft, IconSearch, IconX } from "@tabler/icons-react";
import { parseAsString, useQueryState } from "nuqs";
import { useFormContext } from "react-hook-form";
import styles from "./style.module.css";

export type MobileSearchProps = Readonly<{
  isMobileSearchOpen: boolean;
  onClose: () => void;
}>;

export default function MobileSearch({
  isMobileSearchOpen,
  onClose,
}: MobileSearchProps): React.JSX.Element {
  const [keyword, setKeyword] = useQueryState(
    "keyword",
    parseAsString
      .withDefault("")
      .withOptions({ history: "push", scroll: true }),
  );
  const { handleSubmit, register } = useFormContext();

  return (
    <div className={styles.container}>
      <div className={styles.inner}>
        <button aria-label="戻る" onClick={onClose}>
          <IconArrowLeft size={24} />
        </button>
        <form
          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          onSubmit={handleSubmit((data) => {
            setKeyword(data.keyword.replace(/\s+/g, " ").trim());
          })}
        >
          <div className={styles.searchContainer}>
            <input
              // 二重登録を防ぐため、isMobileSearchOpenがfalseの場合はregisterを使用しない
              {...(isMobileSearchOpen ? register("keyword") : {})}
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
      </div>
    </div>
  );
}
