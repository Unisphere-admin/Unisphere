import type { MetadataRoute } from "next";

/**
 * Auto-generated XML sitemap served at /sitemap.xml.
 *
 * Only public marketing routes are listed here. Auth-gated paths
 * (/dashboard, /admin, /signup, /login, /credits, /reset-password,
 * /paywall, /survey, /session, /meeting) are excluded by design and
 * additionally blocked in robots.ts.
 *
 * priority and changeFrequency are hints, not commitments — Google ignores
 * them when scoring pages, but other crawlers still use them.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://unisphere.my";
  const now = new Date();

  return [
    {
      url: `${base}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${base}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${base}/tutors`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${base}/testimonials`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${base}/summer-studio`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${base}/resources`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${base}/become-a-tutor`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];
}
