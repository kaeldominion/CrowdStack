/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@crowdstack/ui", "@crowdstack/shared"],
  webpack: (config) => {
    // Add alias for server-only exports
    config.resolve.alias = {
      ...config.resolve.alias,
      "@crowdstack/shared/server": require("path").resolve(
        __dirname,
        "../../packages/shared/src/server.ts"
      ),
    };
    return config;
  },
};

module.exports = nextConfig;

