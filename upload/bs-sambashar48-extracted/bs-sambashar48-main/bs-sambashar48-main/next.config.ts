import type { NextConfig } from "next";
import withSerwist from "@serwist/next";

const nextConfig: NextConfig = {
  // SECURITY: Enable TypeScript checking during build to catch type-related security issues
  typescript: {
    ignoreBuildErrors: false,
  },

  // Enable React Strict Mode for better development checks
  reactStrictMode: true,

  // إعداد Turbopack (الافتراضي في Next.js 16)
  turbopack: {},

  async headers() {
    return [
      {
        source: '/manifest.json',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600' },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
    ];
  },
};

export default withSerwist({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
})(nextConfig);
