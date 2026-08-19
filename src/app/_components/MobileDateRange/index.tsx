import { IconArrowLeft, IconX } from "@tabler/icons-react";
import styles from "./style.module.css";

export type MobileDateRangeProps = Readonly<{
  fromDate: string;
  onClose: () => void;
  setFromDate: (value: string) => void;
  setToDate: (value: string) => void;
  toDate: string;
}>;

export default function MobileDateRange({
  fromDate,
  onClose,
  setFromDate,
  setToDate,
  toDate,
}: MobileDateRangeProps): React.JSX.Element {
  return (
    <div className={styles.container}>
      <div className={styles.inner}>
        <button aria-label="戻る" onClick={onClose}>
          <IconArrowLeft size={24} />
        </button>
        <div className={styles.dateRange}>
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
      </div>
    </div>
  );
}
