import { SITE } from "@/lib/site";

// Served at /manifest.webmanifest
export default function manifest() {
  return {
    name: SITE.name,
    short_name: "Automotive",
    description: SITE.description,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#111827",
    icons: [
      { src: "/favicon.ico", sizes: "any", type: "image/x-icon" },
      { src: SITE.logo, sizes: "612x408", type: "image/png" },
    ],
  };
}
