import type { MetadataRoute } from "next";

/**
 * Generated /robots.txt.
 *
 * Public marketing routes are crawlable. Everything that requires auth, holds
 * private user data, or has no SEO value is disallowed at the path-prefix
 * level. Per-route layout files also send `robots: { index: false }` headers
 * for defence in depth.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/dashboard/",
          "/signup",
          "/login",
          "/credits",
          "/credits/success",
          "/reset-password",
          "/paywall",
          "/survey",
          "/session/",
          "/meeting/",
          "/marketplace",
        ],
      },
    ],
    sitemap: "https://unisphere.my/sitemap.xml",
    host: "https://unisphere.my",
  };
}
