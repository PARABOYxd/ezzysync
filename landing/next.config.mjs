import { redirects } from "./src/data/redirects.js";

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Serve AVIF where the browser supports it, WebP otherwise.
    formats: ["image/avif", "image/webp"],
  },
  async redirects() {
    return redirects;
  },
};

export default nextConfig;
