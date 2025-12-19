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
};

module.exports = nextConfig;

