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
      // Proxy all backend API paths to pybpm-api (handles /api/v1/* and bare paths like /dashboard/*, /inbox/*)
      { source: '/api/:path*', destination: `${PYBPM_API_URL}/api/:path*` },
      { source: '/dashboard/:path*', destination: `${PYBPM_API_URL}/dashboard/:path*` },
      { source: '/inbox(:path*)', destination: `${PYBPM_API_URL}/inbox$1` },
      { source: '/bpm/:path*', destination: `${PYBPM_API_URL}/bpm/:path*` },
      { source: '/events/schedules(:path*)', destination: `${PYBPM_API_URL}/events/schedules$1` },
    ];
  },
};

export default nextConfig;
