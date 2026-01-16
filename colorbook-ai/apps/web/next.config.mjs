/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@colorbook/shared'],
  // Ensure Vercel detects this as a Next.js app
  output: undefined, // Let Vercel handle output mode
};

export default nextConfig;


