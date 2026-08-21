/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        // Step 3's Restaurant/Culture discovery tiles — a stable, permanent
        // host, unlike the AI mood illustration feature's per-request Fal.ai
        // URLs (which use a plain <img> instead; allowlisting a dynamic,
        // credential-gated host here wouldn't make sense the same way).
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

module.exports = nextConfig;
