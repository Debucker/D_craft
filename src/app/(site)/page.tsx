import { Hero } from '@/components/sections/Hero';
import { Splash } from '@/components/brand/Splash';
import { Feedback } from '@/components/sections/Feedback';
import { About } from '@/components/sections/About';
import { Services } from '@/components/sections/Services';
import { Work } from '@/components/sections/Work';
import { Stack } from '@/components/sections/Stack';
import { Contact } from '@/components/sections/Contact';
import type { Project } from '@/content/projects';
import { site } from '@/content/site';
import { getProjects } from '@/lib/projectsServer';

/** Structured data — helps search engines connect the name to the work. */
function PersonSchema({ projects }: { projects: readonly Project[] }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: site.name,
    jobTitle: site.role,
    url: site.url,
    email: `mailto:${site.email}`,
    address: { '@type': 'PostalAddress', addressLocality: 'Tashkent', addressCountry: 'UZ' },
    sameAs: site.socials.filter((s) => s.href.startsWith('http')).map((s) => s.href),
    knowsAbout: [...site.seo.keywords],
    subjectOf: projects
      .filter((project) => project.kind === 'project')
      .map((project) => ({
        '@type': 'CreativeWork',
        name: project.title,
        description: project.blurb,
      })),
  };

  return (
    <script
      type="application/ld+json"
      // Serialised from local, typed config — no user input reaches this.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// The Work section reads from an admin-editable store rather than a static
// file, so this page must render fresh per request — otherwise a change made
// in /admin wouldn't appear until the next build.
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const projects = await getProjects();

  return (
    <>
      <PersonSchema projects={projects} />
      <Splash id="home" />
      <Hero />
      <Feedback />
      <About />
      <Services />
      <Work projects={projects} />
      <Stack />
      <Contact />
    </>
  );
}
