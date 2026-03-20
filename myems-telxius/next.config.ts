import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  basePath: '/telxius',
  trailingSlash: true,
  /* config options here */
};

export default nextConfig;
