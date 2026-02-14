import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    typescript: {
        // Disable TypeScript errors during production builds
        ignoreBuildErrors: true,
    },
};

export default nextConfig;
