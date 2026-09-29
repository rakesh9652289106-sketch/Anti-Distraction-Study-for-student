import type { NextConfig } from "next";

let rawBackendUrl = process.env.BACKEND_URL || `http://127.0.0.1:${process.env.BACKEND_PORT || '5002'}`;

// If Render assigned an internal service name without a domain, auto-expand to .onrender.com
if (rawBackendUrl && !rawBackendUrl.includes('.') && !rawBackendUrl.includes('localhost') && !rawBackendUrl.includes('127.0.0.1')) {
  rawBackendUrl = `${rawBackendUrl.replace(/^https?:\/\//, '')}.onrender.com`;
}

const BACKEND_URL = rawBackendUrl.startsWith('http') ? rawBackendUrl : `https://${rawBackendUrl}`;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/api/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${BACKEND_URL}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
