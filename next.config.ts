import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "u9a6wmr3as.ufs.sh",
      },
    ],
    // Evita falhas de otimização em dev quando host remoto bloqueia requisições
    unoptimized: process.env.NODE_ENV !== "production",
  },
};

export default nextConfig;
