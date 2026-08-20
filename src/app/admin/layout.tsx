import type { Metadata } from 'next';

/**
 * Covers /admin and /admin/login alike — a personal control panel has
 * nothing a search index should ever show.
 */
export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
