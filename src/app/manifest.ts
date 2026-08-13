import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LifeOS — Personal operating system",
    short_name: "LifeOS",
    description: "Privacy-first, source-linked personal records.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#f5f7f2",
    theme_color: "#f5f7f2",
    orientation: "portrait-primary",
    categories: ["health", "finance", "productivity", "lifestyle"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
