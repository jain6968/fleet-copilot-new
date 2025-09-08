/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_BACKEND:
      process.env.NEXT_PUBLIC_BACKEND ??
      process.env.BACKEND_BASE_URL ??
      "http://localhost:4000"
  }
};
