import type { MetadataRoute } from "next";

const siteUrl = "https://tahiti-trip.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/en",
    "/peche",
    "/en/fishing",
    "/baleines",
    "/en/whale-watching",
    "/permis",
    "/contact",
    "/en/contact",
  ];

  return routes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route ? "weekly" : "monthly",
    priority: route ? 0.8 : 1,
  }));
}
