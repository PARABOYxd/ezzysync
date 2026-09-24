import { redirects } from "./src/data/redirects.js";

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // The site is served through Vercel "services" (see ../vercel.json),
    // where the /_next/image optimizer 404s. Images ship as they are, so
    // keep them small: `npm run images:optimize` after adding any.
    unoptimized: true,
  },
  async redirects() {
    return redirects;
  },
};

export default nextConfig;
