import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** Built once at build time (also needed for `npm run export`). */
export const dynamic = "force-static";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/edit", "/view", "/join"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
