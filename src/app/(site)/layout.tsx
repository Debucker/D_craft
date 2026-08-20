import { Nav } from '@/components/layout/Nav';
import { Footer } from '@/components/layout/Footer';

/**
 * The portfolio shell: nav, main landmark, footer, skip link.
 *
 * /notes sits outside this group because it is a full-screen canvas with its
 * own auto-hiding bar — the fixed site nav would cover the top of the board.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-70 focus:rounded-pill focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-bg"
      >
        Skip to content
      </a>

      <Nav />
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}
