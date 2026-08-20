import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  /**
   * `next dev` and `next build` both write to `.next` by default, so building
   * while the dev server is running overwrites the chunks it has already
   * loaded — the server then dies with "Cannot find module './611.js'".
   * `npm run build:check` sets this to a scratch directory so a verification
   * build can run alongside dev. A real deploy build leaves it unset.
   */
  distDir: process.env.NEXT_DIST_DIR || '.next',
  poweredByHeader: false,
  // Other lockfiles exist further up the drive; pin tracing to this project.
  outputFileTracingRoot: process.cwd(),
  /**
   * The board used to live at /notes. Anything already bookmarked there — or
   * a tab left open — should land on the renamed page rather than a 404.
   */
  async redirects() {
    return [{ source: '/notes', destination: '/feedback', permanent: false }];
  },

  // No remote images are used; everything ships as inline SVG or CSS.
  images: {
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;
