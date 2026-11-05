/** @type {import('next').NextConfig} */
const isGhPages = process.env.NEXT_PUBLIC_BUILD_TARGET === 'gh-pages' || process.env.GITHUB_PAGES === 'true';

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    cpus: 1,
    workerThreads: false,
  },
  ...(isGhPages
    ? {
        output: 'export',
        basePath: '/renewaldesk',
      }
    : {}),
};

module.exports = nextConfig;
