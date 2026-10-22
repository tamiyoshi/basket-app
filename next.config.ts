import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
  images: {
    remotePatterns: [
      process.env.NEXT_PUBLIC_SUPABASE_URL
        ? {
            protocol: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).protocol.slice(0, -1) as "http" | "https",
            hostname: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname,
            port: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).port,
            pathname: "/storage/v1/object/public/court-photos/**",
          }
        : {
            protocol: "https",
            hostname: "**.supabase.co",
            pathname: "/storage/v1/object/public/court-photos/**",
          },
    ],
  },
};

export default nextConfig;
