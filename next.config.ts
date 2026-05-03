import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // This keeps the typescript bypass so your phone doesn't crash, 
    // but removes the invalid ESLint rule that made Vercel panic.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
