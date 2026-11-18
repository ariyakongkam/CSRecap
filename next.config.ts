import type { NextConfig } from "next";

/**
 * `npm run export` builds the whole site as plain files in `out/`, for self-hosting on any web server
 * (csgg has no server code: strats live in the browser and in links). npm names the running script in
 * npm_lifecycle_event, which works the same on Windows, macOS and Linux.
 */
const exporting = process.env.npm_lifecycle_event === "export" || !!process.env.STATIC_EXPORT;

const nextConfig: NextConfig = exporting ? { output: "export" } : {};

export default nextConfig;
