import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // Enable standalone mode for Docker deployment
    output: 'standalone',
    
    // Disable telemetry
    experimental: {
        // Enable server actions if needed
    },
    
    // Environment variables that should be available at build time
    env: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api',
    },
    
    // Configure image optimization
    images: {
        remotePatterns: [],
        unoptimized: process.env.NODE_ENV === 'development',
    },

    // Turbopack configuration (Next.js 16 default bundler)
    turbopack: {},
};

export default nextConfig;
