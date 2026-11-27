"use client";
import { IconDownload } from "@tabler/icons-react";
import { useGetCookie } from "cookies-next/client";
import { useTheme } from "next-themes";
import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";
import usePwa from "use-pwa";
import { setIsNotMovie, setIsNotOnigiri, setIsNotRadio } from "../../actions";
import styles from "./style.module.css";

const Toggle = dynamic(async () => import("react-toggle"), { ssr: false });
// GitHub redirects this to the asset of the newest release, so the link
// stays valid as long as each release attaches the APK under this name.
const APK_URL =
  "https://github.com/piro0919/omocoro-archive/releases/latest/download/app-release-signed.apk";
const subscribeNothing = (): (() => void) => () => {};

function useIsAndroid(): boolean {
  return useSyncExternalStore(
    subscribeNothing,
    () => navigator.userAgent.includes("Android"),
    () => false,
  );
}

export default function Settings(): React.JSX.Element {
  const getCookie = useGetCookie();
  const isNotOnigiri = getCookie("is-not-onigiri");
  const isNotMovie = getCookie("is-not-movie");
  const isNotRadio = getCookie("is-not-radio");
  const { setTheme, theme } = useTheme();
  const { canInstall, install, isInstalled, isSupported } = usePwa();
  const isAndroid = useIsAndroid();

  return (
    <div className={styles.container}>
      <div className={styles.inner}>
        <label className={styles.label}>
          <span className={styles.labelText}>
            ほかほかおにぎりクラブ会員専用コンテンツを非表示にする
          </span>
          <Toggle
            onChange={(e) => {
              setIsNotOnigiri(e.currentTarget.checked);
            }}
            defaultChecked={isNotOnigiri === "true"}
            key={isNotOnigiri}
          />
        </label>
        <label className={styles.label}>
          <span className={styles.labelText}>動画を非表示にする</span>
          <Toggle
            onChange={(e) => {
              setIsNotMovie(e.currentTarget.checked);
            }}
            defaultChecked={isNotMovie === "true"}
            key={isNotMovie}
          />
        </label>
        <label className={styles.label}>
          <span className={styles.labelText}>ラジオを非表示にする</span>
          <Toggle
            onChange={(e) => {
              setIsNotRadio(e.currentTarget.checked);
            }}
            defaultChecked={isNotRadio === "true"}
            key={isNotRadio}
          />
        </label>
        <label className={styles.label}>
          <span className={styles.labelText}>ダークモードを有効にする</span>
          <Toggle
            onChange={(e) => {
              setTheme(e.currentTarget.checked ? "dark" : "light");
            }}
            defaultChecked={theme === "dark"}
          />
        </label>
        {isSupported && !isInstalled ? (
          <div className={styles.label}>
            <span className={styles.labelText}>ホーム画面に追加する</span>
            <button
              onClick={() => {
                void install();
              }}
              className={styles.button}
              disabled={!canInstall}
            >
              <IconDownload size={18} />
              <span className={styles.buttonText}>インストール</span>
            </button>
          </div>
        ) : null}
        {isAndroid && !isInstalled ? (
          <div className={styles.label}>
            <span className={styles.labelText}>
              Android アプリをダウンロードする
            </span>
            <a className={styles.button} href={APK_URL}>
              <IconDownload size={18} />
              <span className={styles.buttonText}>APK</span>
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}
