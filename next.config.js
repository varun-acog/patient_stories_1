/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.experiments = {
      syncWebAssembly: true, // ✅ Enable WebAssembly
      layers: true, // ✅ Enable layers to fix the error
    };
    return config;
  },
};

export default nextConfig; // ✅ Use export default if using ES modules
