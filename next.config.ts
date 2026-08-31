import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits .next/standalone — a self-contained server with only the modules
  // it actually uses, which is what the Docker image runs. Vercel ignores
  // this and uses its own bundling, so it's safe to leave on everywhere.
  output: "standalone",

  // The cover image arrives as a base64 data URL and is written straight
  // into the page and the EPUB, so the optimizer has nothing to do with it.
  images: { unoptimized: true },

  // Native/CJS packages that must stay outside the server bundle.
  serverExternalPackages: ["pg", "pdfkit", "epub-gen-memory"],

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
