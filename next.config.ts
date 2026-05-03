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
    remotePatterns: [
      { hostname: "omocoro.jp", protocol: "https" },
      { hostname: "cdn.omocoro.jp", protocol: "https" },
      { hostname: "img.omocoro.jp", protocol: "https" },
    ],
  },
  reactStrictMode: false,
});

export default nextConfig;
