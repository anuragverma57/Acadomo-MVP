import type { MetadataRoute } from "next";

/**
 * Web app manifest. This alone makes the site installable — no service worker
 * required. Kept as a separate step from the SW so install behaviour can be
 * verified on a real device before any caching is introduced.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AcaDomo — Student Accommodation",
    short_name: "AcaDomo",
    description:
      "Discover, compare and enquire about student accommodation across global study destinations.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fbfaf7",
    theme_color: "#fbfaf7",
    categories: ["education", "lifestyle", "travel"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Without this Android crops the standard icon badly.
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
