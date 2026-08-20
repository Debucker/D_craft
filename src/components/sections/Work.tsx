import { Section } from '@/components/layout/Section';
import { Stagger, StaggerItem } from '@/components/motion/Reveal';
import { ProjectCard } from '@/components/sections/ProjectCard';
import type { Project } from '@/content/projects';
import { site } from '@/content/site';

/**
 * Takes `projects` as a prop rather than importing the static array — the
 * page fetches it once, live, from the admin-editable store (`getProjects`
 * in `projectsServer.ts`), so a change made in `/admin` shows up here
 * without a rebuild.
 */
export function Work({ projects }: { projects: readonly Project[] }) {
  return (
    <Section
      id="work"
      index="03"
      label="Work"
      title={site.work.heading}
      lead={site.work.lead}
    >
      <Stagger
        as="ul"
        stagger={0.09}
        className="mt-stack grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5"
      >
        {projects.map((project, index) => (
          <StaggerItem
            key={project.slug}
            as="li"
            className={project.featured ? 'h-full md:col-span-2' : 'h-full'}
          >
            <ProjectCard project={project} index={String(index + 1).padStart(2, '0')} />
          </StaggerItem>
        ))}
      </Stagger>
    </Section>
  );
}
