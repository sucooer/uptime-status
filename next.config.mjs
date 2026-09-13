/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  // Cloudflare Pages / Vercel 均为只读文件系统，禁用构建期写盘特性
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
