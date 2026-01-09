// Injected content via Sentry wizard below
const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@crowdstack/ui", "@crowdstack/shared", "framer-motion"],
  // Increase body size limit for file uploads (fliers, photos, videos)
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
    // Enable instrumentation hook for Sentry
    instrumentationHook: true,
    // Optimize output file tracing - only include what's actually needed
    // This reduces build time by not tracing unnecessary node_modules
    outputFileTracingIncludes: {
      '/api/*': [
        './node_modules/@supabase/**/*.js',
        './node_modules/@sentry/**/*.js',
      ],
    },
    // Optimize imports from these packages to reduce bundle size
    optimizePackageImports: [
      "@crowdstack/ui",
      "recharts",
      "framer-motion",
      "lucide-react",
    ],
  },
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
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
    // Prefer modern image formats for smaller file sizes
    formats: ["image/avif", "image/webp"],
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

// Wrap with Sentry configuration
module.exports = withSentryConfig(
  nextConfig,
  {
    // For all available options, see:
    // https://github.com/getsentry/sentry-webpack-plugin#options

    // Suppresses source map uploading logs during build
    silent: true,
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    // Only upload source maps in production to speed up dev builds
    dryRun: process.env.NODE_ENV !== 'production',
  },
  {
    // For all available options, see:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

    // Upload a larger set of source maps for better debugging
    widenClientFileUpload: true,

    // Do NOT transpile SDK for IE11 - we only support modern browsers
    // This saves ~30-50KB in the client bundle
    transpileClientSDK: false,

    // Routes browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
    // This can increase your server load as well as your hosting bill.
    // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
    // side errors will fail.
    tunnelRoute: "/monitoring",

    // Hides source maps from generated client bundles
    hideSourceMaps: true,

    // Automatically tree-shake Sentry logger statements to reduce bundle size
    disableLogger: true,

    // Enables automatic instrumentation of Vercel Cron Monitors.
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,
  }
);

