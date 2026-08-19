import type { MetadataRoute } from "next";

const SITE_URL = "https://omocoro-archive.kkweb.io";

export default function robots(): MetadataRoute.Robots {
  return {
    host: SITE_URL,
    rules: { allow: "/", disallow: ["/api/", "/settings"], userAgent: "*" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
