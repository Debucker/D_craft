import type { Metadata, Viewport } from 'next';
import { Caveat, Inter, Permanent_Marker, Playfair_Display, Space_Grotesk } from 'next/font/google';

import './globals.css';
import { AnchorFocus } from '@/components/motion/AnchorFocus';
import { AnimatedFavicon } from '@/components/brand/AnimatedFavicon';
import { site } from '@/content/site';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

/** The notes board. Caveat is a handwriting face that stays legible at size. */
const caveat = Caveat({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  variable: '--font-caveat',
});

/** A felt-tip marker, for notes that want to shout. */
const permanentMarker = Permanent_Marker({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400'],
  variable: '--font-marker',
});

/** A high-contrast serif, for notes that want to be read slowly. */
const playfair = Playfair_Display({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  variable: '--font-serif',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  variable: '--font-space-grotesk',
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: site.seo.title,
    template: `%s — ${site.name}`,
  },
  description: site.seo.description,
  keywords: [...site.seo.keywords],
  authors: [{ name: site.name, url: site.url }],
  creator: site.name,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: site.url,
    title: site.seo.title,
    description: site.seo.description,
    siteName: site.name,
  },
  twitter: {
    card: 'summary_large_image',
    title: site.seo.title,
    description: site.seo.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
};

export const viewport: Viewport = {
  themeColor: '#0b0b0c',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable} ${caveat.variable} ${permanentMarker.variable} ${playfair.variable}`}>
      <body className="bg-bg text-fg antialiased">
        {/* Framer server-renders its `initial` state as inline styles, so
            without JS every revealed element would stay at opacity 0. Nothing
            animates in that situation anyway — just show the content. */}
        <noscript>
          <style>{`[style*="opacity:0"],[style*="opacity: 0"]{opacity:1!important;transform:none!important}`}</style>
        </noscript>

        <AnchorFocus />
        <AnimatedFavicon />

        {/* Film grain. Fixed, painted once, never repainted while scrolling. */}
        <div className="grain" aria-hidden />

        {/* Nav, main and footer live in the (site) group. /notes is a
            full-screen canvas and deliberately renders without them. */}
        {children}
      </body>
    </html>
  );
}
