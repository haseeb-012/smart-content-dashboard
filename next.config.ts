import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets a second build (e.g. live-mode e2e) live beside the default one.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
