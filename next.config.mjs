/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  poweredByHeader: false,
  reactStrictMode: true,
  agentRules: false,
  images: { unoptimized: true },
  // Each language has its own root layout, so the 404 page cannot come from a shared one.
  experimental: { globalNotFound: true },
};
export default nextConfig;
