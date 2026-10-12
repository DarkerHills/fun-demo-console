import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // The console is intentionally browser-rendered (see app/(console)/layout.tsx),
    // so only segments that opt in with `instant` are validated.
    instantInsights: { validationLevel: "manual-warning" },
  },
  async redirects() {
    return [{ source: "/", destination: "/overview", permanent: false }];
  },
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
