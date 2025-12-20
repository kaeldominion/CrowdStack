/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@crowdstack/ui", "@crowdstack/shared", "framer-motion"],
  webpack: (config, { isServer }) => {
    // Add aliases for shared package subpaths
    config.resolve.alias = {
      ...config.resolve.alias,
      "@crowdstack/shared": require("path").resolve(
        __dirname,
        "../../packages/shared/src"
      ),
    };
    
    // Externalize server-only dependencies for client builds
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "server-only": false,
      };
    }
    
    return config;
  },
  // Local dev proxy: forward /app/* and /door/* to apps/app (port 3007)
  // This unifies localhost origin to 3006 for Supabase auth cookie sharing
  // Note: In dev mode, rewrites proxy to external URLs
  async rewrites() {
    const isLocalDev = 
      process.env.NODE_ENV === "development" || 
      process.env.NEXT_PUBLIC_APP_ENV === "local";
    
    if (isLocalDev) {
      const appPort = process.env.APP_DEV_PORT || "3007";
      return [
        // Proxy /app/* routes to apps/app (unified dashboard)
        {
          source: "/app/:path*",
          destination: `http://localhost:${appPort}/app/:path*`,
        },
        // Proxy /admin/* routes to apps/app (admin dashboard)
        {
          source: "/admin/:path*",
          destination: `http://localhost:${appPort}/admin/:path*`,
        },
        // Proxy /door/* routes to apps/app (door scanner)
        {
          source: "/door/:path*",
          destination: `http://localhost:${appPort}/door/:path*`,
        },
        // Proxy Next.js static chunks that might be requested from proxied routes
        // This is a catch-all - Next.js rewrites will handle most, but we need this for chunks
        // Note: This might conflict with web app's own chunks, but in practice Next.js
        // uses build IDs to separate them, so it should be fine
        // Proxy API routes used by app
        // Note: Only proxy if route doesn't exist in web
        {
          source: "/api/admin/:path*",
          destination: `http://localhost:${appPort}/api/admin/:path*`,
        },
        {
          source: "/api/organizer/:path*",
          destination: `http://localhost:${appPort}/api/organizer/:path*`,
        },
        {
          source: "/api/venue/:path*",
          destination: `http://localhost:${appPort}/api/venue/:path*`,
        },
        {
          source: "/api/promoter/:path*",
          destination: `http://localhost:${appPort}/api/promoter/:path*`,
        },
        {
          source: "/api/events/:path*",
          destination: `http://localhost:${appPort}/api/events/:path*`,
        },
        {
          source: "/api/debug/:path*",
          destination: `http://localhost:${appPort}/api/debug/:path*`,
        },
      ];
    }
    
    return [];
  },
};

module.exports = nextConfig;

