import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    /* config options here */
    rewrites: async () => {
        return {
            beforeFiles: [
                {
                    // Whenever the frontend fetches /api/something...
                    source: '/api/:path*',
                    // ...proxy it to the backend silently!
                    destination: 'http://localhost:3001/api/:path*',
                }
            ]
        };
    },
};

export default nextConfig;
