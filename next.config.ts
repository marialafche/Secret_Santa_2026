import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pages that moved under /g/<group> when the app gained multiple groups.
  async redirects() {
    return ["/wishlist", "/wishlist/:id", "/chat", "/admin"].map((source) => ({
      source,
      destination: "/",
      permanent: false,
    }));
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
