/**
 * SKILLS / STACK
 * -----------------------------------------------------------------------
 * Deliberately no proficiency bars, no percentages, no star ratings — they
 * are unverifiable and every reader knows it. Just what I actually reach for,
 * grouped by what I use it to do.
 */

export interface StackGroup {
  readonly title: string;
  /** One short line explaining what this group is *for*. */
  readonly note: string;
  readonly items: readonly string[];
}

export const stack: readonly StackGroup[] = [
  {
    title: 'Building interfaces',
    note: 'Where most of my hours go.',
    items: ['HTML/CSS/JS', 'TypeScript', 'React', 'Next.js', 'Tailwind CSS', 'Framer Motion', 'Vite'],
  },
  {
    title: 'Back end & data',
    note: 'APIs, storage, and the glue between them.',
    items: ['Node.js', 'Python', 'Django', 'FastAPI', 'PostgreSQL', 'Prisma', 'REST & WebSockets'],
  },
  {
    title: 'Machine learning',
    note: 'Applied, not academic — models that go into products.',
    items: ['PyTorch', 'DeepForest', 'OpenCV', 'NumPy', 'Pandas'],
  },
  {
    title: 'Shipping',
    note: 'Getting it in front of people and keeping it up.',
    items: ['Vercel', 'Docker', 'Git & GitHub Actions', 'Linux', 'Cloudflare'],
  },
  {
    title: 'Design & media',
    note: 'Brand, print, video and audio — the MUN identity work and beyond.',
    items: [
      'Figma',
      'Adobe Photoshop',
      'Adobe Illustrator',
      'CorelDRAW',
      'Canva',
      'CapCut',
      'FL Studio',
    ],
  },
] as const;
