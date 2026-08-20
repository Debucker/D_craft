import { Section } from '@/components/layout/Section';
import { Reveal, Stagger, StaggerItem } from '@/components/motion/Reveal';
import { site } from '@/content/site';

export function About() {
  return (
    <Section id="about" index="01" label="About" title={site.about.heading}>
      <div className="mt-stack grid gap-stack lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] lg:gap-16">
        <Reveal>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-8 lg:sticky lg:top-28 lg:grid-cols-1 lg:gap-y-7">
            {site.about.facts.map((fact) => (
              <div key={fact.label} className="border-t border-line pt-4">
                <dt className="eyebrow">{fact.label}</dt>
                <dd className="mt-2 font-display text-lg text-fg">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </Reveal>

        <Stagger stagger={0.1} className="max-w-prose space-y-7">
          {site.about.paragraphs.map((paragraph, index) => (
            <StaggerItem key={index} as="p" className="text-lg text-muted">
              {paragraph}
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </Section>
  );
}
