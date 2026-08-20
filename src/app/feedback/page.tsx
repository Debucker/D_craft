import type { Metadata } from 'next';

import { Canvas } from '@/components/notes/Canvas';
import { Splash } from '@/components/brand/Splash';
import { site } from '@/content/site';

export const metadata: Metadata = {
  title: 'My feedback',
  description: `Leave feedback for ${site.name} on a shared sticky-note board.`,
  // A personal scratch canvas has nothing useful for a search index.
  robots: { index: false, follow: true },
};

export default function NotesPage() {
  return (
    <>
      <Splash id="feedback" />
      <Canvas />
    </>
  );
}
