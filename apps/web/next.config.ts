import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@ancora/config", "@ancora/shared-types", "@ancora/ui"],
};

export default nextConfig;
