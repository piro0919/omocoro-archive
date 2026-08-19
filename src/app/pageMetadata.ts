import { type Metadata } from "next";

type PageMetadataOptions = {
  description: string;
  /** 検索結果に出す必要が無いページは false */
  indexable?: boolean;
  /** サイト内の絶対パス。canonical と og:url に使う */
  path: string;
  title: string;
};

/**
 * ページ単位の metadata を組み立てる。
 *
 * Next は title と description を openGraph へ自動では流さない。
 * 明示しないと、下層ページを共有したときのカードが全部トップと
 * 同じ見出しになる。canonical と og:url も併せてここで埋める。
 */
export default function pageMetadata({
  description,
  indexable = true,
  path,
  title,
}: PageMetadataOptions): Metadata {
  return {
    alternates: { canonical: path },
    description,
    openGraph: { description, title, url: path },
    title,
    twitter: { description, title },
    ...(indexable ? {} : { robots: { follow: false, index: false } }),
  };
}
