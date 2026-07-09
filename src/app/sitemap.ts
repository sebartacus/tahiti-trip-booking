import type { MetadataRoute } from "next";

const siteUrl = "https://tahiti-trip.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/peche", "/baleines", "/permis", "/contact"];

  return routes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route ? "weekly" : "monthly",
    priority: route ? 0.8 : 1,
  }));
}
