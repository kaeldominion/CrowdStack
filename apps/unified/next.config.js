/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@crowdstack/ui", "@crowdstack/shared", "framer-motion"],
  // Increase body size limit for photo uploads (10MB per file)
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
    responseLimit: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
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
};

module.exports = nextConfig;

