const nextConfig = {
  reactStrictMode: true,

  // Performance optimizations for development
  ...(process.env.NODE_ENV === 'development' && {
    // Bundle analyzer for production builds
    webpack: (config, { dev, isServer }) => {
      // Bundle analysis
      if (process.env.ANALYZE === 'true') {
        const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            openAnalyzer: true,
            reportFilename: isServer ? '../analyze/server.html' : './analyze/client.html'
          })
        );
      }

      if (dev) {
        // Reduce memory usage and improve build speed
        config.optimization = {
          ...config.optimization,
          splitChunks: {
            chunks: 'all',
            cacheGroups: {
              vendor: {
                test: /[\\/]node_modules[\\/]/,
                name: 'vendors',
                chunks: 'all',
              },
            },
          },
        };

        // Exclude unnecessary files from watching
        config.watchOptions = {
          ignored: [
            '**/node_modules/**',
            '**/data/**/*.json',
            '**/.git/**',
            '**/dist/**',
            '**/build/**',
            '**/.next/**',
            '**/coverage/**',
            '**/scripts/**',
            '**/*.test.{js,jsx,ts,tsx}',
            '**/*.spec.{js,jsx,ts,tsx}',
            '**/__tests__/**',
            '**/README.md',
            '**/*.md',
            '**/docs/**',
            '**/uploads/**',
            '**/public/**',
            '**/.env*',
            '**/package-lock.json',
            '**/yarn.lock',
            '**/pnpm-lock.yaml',
          ],
          // Reduce CPU usage and improve performance
          aggregateTimeout: 300,
          poll: false,
        };

        // Optimize module resolution
        config.resolve.symlinks = false;

        // Reduce bundle analysis overhead in development
        config.optimization.removeAvailableModules = false;
        config.optimization.removeEmptyChunks = false;
        config.optimization.splitChunks = false;

        // Improve Fast Refresh performance
        config.experiments = {
          ...config.experiments,
          topLevelAwait: true,
        };

        // Reduce memory usage
        config.optimization.usedExports = false;
        config.optimization.sideEffects = false;
      }

      return config;
    },

    // Experimental features for better performance
    experimental: {
      // Faster builds with SWC
      swcMinify: true,
      // Reduce memory usage
      esmExternals: 'loose',
      // Faster refresh
      optimizeCss: false,
    },

    // Development server optimizations
    devIndicators: {
      buildActivity: false, // Disable build indicator for cleaner UI
    },

    // Reduce compilation overhead
    typescript: {
      // Skip type checking during build for faster development
      ignoreBuildErrors: process.env.NODE_ENV === 'development',
    },

    eslint: {
      // Skip ESLint during build for faster development
      ignoreDuringBuilds: process.env.NODE_ENV === 'development',
    },
  }),

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
        pathname: "/**",
      },
    ],
  },

  // Production optimizations
  ...(process.env.NODE_ENV === 'production' && {
    experimental: {
      swcMinify: true,
    },
    compiler: {
      removeConsole: true,
    },
    // Tree shaking optimizations
    webpack: (config, { isServer }) => {
      // Optimize date-fns imports for tree shaking
      config.resolve.alias = {
        ...config.resolve.alias,
        'date-fns': 'date-fns/esm',
      };

      // Optimize framer-motion imports
      if (!isServer) {
        config.resolve.alias = {
          ...config.resolve.alias,
          'framer-motion': 'framer-motion/dist/framer-motion.es.js',
        };
      }

      return config;
    },
  }),
};

module.exports = nextConfig;
