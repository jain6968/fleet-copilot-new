/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // ✅ keep your backend env variable
  env: {
    NEXT_PUBLIC_BACKEND:
      process.env.NEXT_PUBLIC_BACKEND ??
      process.env.BACKEND_BASE_URL ??
      "http://localhost:4000",
  },

  // ✅ top-level logging config (not under experimental)
  logging: {
    level: "verbose", // 'verbose' | 'info' | 'warn' | 'error'
  },

  // Optional: helps container/serverless deploys
  output: "standalone",

  // Optional: don't block deploys if ESLint errors
  // eslint: { ignoreDuringBuilds: true },

  // Optional: ignore TS errors if absolutely needed
  // typescript: { ignoreBuildErrors: true },
};

module.exports = nextConfig;
