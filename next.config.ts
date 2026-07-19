import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Anciennes URLs françaises
      {
        source: "/peche-au-gros",
        destination: "/peche",
        permanent: true,
      },
      {
        source: "/permis-bateau",
        destination: "/permis",
        permanent: true,
      },
      {
        source: "/permis-bateau/1000",
        destination: "/permis",
        permanent: true,
      },

      // Très anciennes URLs avec /index.php/
      {
        source: "/index.php/peche-au-gros",
        destination: "/peche",
        permanent: true,
      },
      {
        source: "/index.php/whales-watching",
        destination: "/baleines",
        permanent: true,
      },
      {
        source: "/index.php/permis-bateau",
        destination: "/permis",
        permanent: true,
      },

      // Anciennes URLs anglaises
      {
        source: "/en/boat-licence",
        destination: "/permis",
        permanent: true,
      },
      {
        source: "/en/deep-sea-fishing",
        destination: "/en/fishing",
        permanent: true,
      },
      {
        source: "/en/home",
        destination: "/en",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;