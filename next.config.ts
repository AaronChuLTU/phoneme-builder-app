/**
 * next.config.ts
 *
 * output: "standalone" makes `next build` trace every file the server
 * actually needs — its own minimal node_modules included — into
 * .next/standalone. Without it, a Docker image would have to ship the
 * entire node_modules folder, which is far larger and slower to build.
 *
 * This is the one config change Docker requires; everything else about the
 * app is unaffected. `npm run dev` and `npm run build && npm run start`
 * behave exactly as before.
 */

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
