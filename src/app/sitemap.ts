import type { MetadataRoute } from "next";

const SITE_URL = "https://omocoro-archive.kkweb.io";

/**
 * next-sitemap はビルド成果物から拾うため、opengraph-image.png や
 * manifest.webmanifest といった実ページでないものまで並べていた。
 * 出したいものだけ自分で書く。設定は検索結果に出す必要が無いので入れない。
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { changeFrequency: "daily" as const, priority: 1, url: SITE_URL },
    {
      changeFrequency: "weekly" as const,
      priority: 0.8,
      url: `${SITE_URL}/writer`,
    },
    {
      changeFrequency: "weekly" as const,
      priority: 0.8,
      url: `${SITE_URL}/category`,
    },
  ].map((entry) => ({ ...entry, lastModified: new Date() }));
}
