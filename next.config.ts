import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development", // REMEMBER: This kills offline mode in localhost!
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      {
        // 🚀 Auto-cache all Supabase database calls!
        urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
        handler: 'NetworkFirst', 
        options: {
          cacheName: 'supabase-offline-cache',
          expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 }, // Keep for 1 week
          networkTimeoutSeconds: 3, 
        },
      },
      {
        // 🚀 Auto-cache the UI assets (Tailwind, Lucide icons, etc.)
        urlPattern: /\/_next\/.*$/i,
        handler: 'NetworkFirst',
        options: { cacheName: 'next-static-assets' }
      }
    ],
  },
});

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default withPWA(nextConfig);
