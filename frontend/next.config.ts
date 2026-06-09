import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(isProd
    ? {
        output: 'export',
        images: {
          unoptimized: true,
        },
      }
    : {
        async rewrites() {
          return [
            {
              source: '/api/:path*',
              destination: 'http://127.0.0.1:5000/api/:path*',
            },
            {
              source: '/uploads/:path*',
              destination: 'http://127.0.0.1:5000/uploads/:path*',
            },
          ];
        },
      }),
};

export default nextConfig;
