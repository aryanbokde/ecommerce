import type { NextConfig } from "next";
import type { Configuration } from "webpack";
import path from "node:path";

// Long-lived, app-wide security headers applied to every response (Step D).
const securityHeaders = [
  // Stop MIME-type sniffing.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Disallow framing (clickjacking) — the app is never embedded.
  { key: "X-Frame-Options", value: "DENY" },
  // Send only the origin on cross-origin navigations.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Drop powerful features we never use.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  // Force HTTPS for a year (ignored over http in dev; effective in prod).
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  // Self-contained production output (.next/standalone) for slim Docker images.
  output: "standalone",

  // Don't advertise the framework.
  poweredByHeader: false,
  // gzip responses from the Node server.
  compress: true,

  // Pin the output-file-tracing root to this project (don't let Next walk up
  // onto C:\). NOTE: the production build uses Turbopack (see package.json
  // `build`) — the legacy `next build --webpack` path crashes here because
  // @vercel/nft traces Prisma's os.homedir() reference and globs the
  // unreadable Windows "Application Data" junction (EPERM). Turbopack's tracer
  // doesn't hit that, so build with Turbopack on this machine.
  outputFileTracingRoot: path.resolve(__dirname),

  // Allowed remote image hosts for next/image optimization. Add your real
  // product-image CDN here; placehold.co is used by the seed/demo data.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "placehold.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },

  webpack(config: Configuration) {
    config.cache = false;
    return config;
  },

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },

  // Auth pages live in the (auth) route group → canonical URLs are /login, /register,
  // /forgot-password (no /auth prefix). Keep the old /auth/* paths working as aliases.
  async redirects() {
    return [
      { source: "/signup", destination: "/register", permanent: false },
      { source: "/auth/login", destination: "/login", permanent: false },
      { source: "/auth/register", destination: "/register", permanent: false },
      {
        source: "/auth/forgot-password",
        destination: "/forgot-password",
        permanent: false,
      },      { source: "/auth/two-factor",
        destination: "/two-factor",
        permanent: false,
      },    ];
  },
};

export default nextConfig;
