import type { MetadataRoute } from "next";

// PWA web manifest (served at /manifest.webmanifest and referenced from the
// root layout metadata). Theme/background match the dark-first UI.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "MyShop",
    short_name: "MyShop",
    description: "Your one-stop ecommerce store",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    categories: ["shopping", "ecommerce"],
    icons: [
      { src: "/favicon.ico", sizes: "any", type: "image/x-icon" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
