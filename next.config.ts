import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

const withSerwist = withSerwistInit({
  disable: process.env.NODE_ENV === "development",
  swDest: "public/sw.js",
  // eslint-disable-next-line write-good-comments/write-good-comments
  // Note: This is only an example. If you use Pages Router,
  // use something else that works, such as "service-worker/index.ts".
  swSrc: "src/app/sw.ts",
});
const nextConfig: NextConfig = withSerwist({
  experimental: {
    typedRoutes: true,
  },
  images: {
    /* Vercel は「元の画像×幅」ごとに変換の料金を取る。既定の幅は16種類あり、
       同じサムネイルでも端末の幅と画素密度が違えば別に変換される（変換の費用は 2026-11 に月 $2 前後）。
       元のサムネイルは幅 800px なので、それを超える幅は作らない。
       42px のアイコン用に 48・96、一覧のカード（250〜340px）用に 384・640・828 */
    deviceSizes: [640, 828],
    imageSizes: [48, 96, 384],
    remotePatterns: [
      { hostname: "omocoro.jp", protocol: "https" },
      { hostname: "cdn.omocoro.jp", protocol: "https" },
      { hostname: "img.omocoro.jp", protocol: "https" },
    ],
  },
  reactStrictMode: false,
});

export default nextConfig;
