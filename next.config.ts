import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    // Server actions and API routes default to 1 MB / 4.5 MB request body limits.
    // Bump to 26 MB so document uploads (capped at 25 MB) can stream through the
    // /api/documents/upload route. See PWA_Features/document-vault.md §5.1.
    serverActions: {
      bodySizeLimit: '26mb',
    },
  },
};

export default nextConfig;
