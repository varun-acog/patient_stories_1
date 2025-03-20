/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Find the rule that handles CSS files
    const cssRule = config.module.rules.find((rule) =>
      rule.test?.toString().includes('.css')
    );

    if (cssRule) {
      // Update the css-loader and postcss-loader in the rule
      cssRule.use = cssRule.use.map((loader) => {
        if (typeof loader === 'object') {
          // Handle css-loader
          if (loader.loader?.includes('css-loader')) {
            return {
              ...loader,
              options: {
                ...loader.options,
                esModule: false, // Force CommonJS behavior
                modules: {
                  ...loader.options.modules,
                  exportLocalsConvention: 'camelCase', // Ensure consistent behavior
                },
              },
            };
          }
          // Handle postcss-loader
          if (loader.loader?.includes('postcss-loader')) {
            return {
              ...loader,
              options: {
                ...loader.options,
                esModule: false, // Force CommonJS behavior
              },
            };
          }
        }
        return loader;
      });
    }

    return config;
  },
};

export default nextConfig;