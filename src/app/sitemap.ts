import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** Built once at build time (also needed for `npm run export`). */
export const dynamic = "force-static";
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
