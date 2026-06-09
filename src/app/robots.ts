import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // /dashboard is the real admin area (the (admin) route group); /admin/*
        // is kept for convention/parity with the access-control config.
        disallow: [
          "/admin/*",
          "/dashboard/*",
          "/shop-manager/*",
          "/support/*",
          "/api/*",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
