import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
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