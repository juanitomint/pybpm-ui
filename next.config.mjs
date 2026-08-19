/** @type {import('next').NextConfig} */

const PYBPM_API_URL = process.env.PYBPM_API_URL || 'http://localhost:5000';

/**
 * PyBPM Next.js Configuration (v16+ compatible)
 * 
 * Environment Variables (from .env):
 * - PYBPM_API_URL: Backend API base URL (default: http://localhost:5000)
 */

const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${PYBPM_API_URL}/api/v1/:path*`,
      },
    ];
  },
  
  // Add CORS headers for API proxying in development
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
};

export default nextConfig;
