import type { MetadataRoute } from "next";

/**
 * Web App Manifest served at /manifest.webmanifest.
 *
 * Provides install hints for iOS/Android home-screen, theme color for the
 * browser chrome, and brand info. The icon list reuses /logo.png in lieu
 * of dedicated 192/512 PWA icons; swap in proper sizes when available.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Unisphere — Your All-In-One Uni Admissions Platform",
    short_name: "Unisphere",
    description:
      "Get matched with admissions tutors who got into top universities.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0e6480",
    icons: [
      {
        src: "/logo.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/logo.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
