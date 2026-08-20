import { Section } from '@/components/layout/Section';
import { Stagger, StaggerItem } from '@/components/motion/Reveal';
import { site } from '@/content/site';

/**
 * WHAT I DO
 * -----------------------------------------------------------------------
 * This replaced a full-viewport typographic moment that rendered the single
 * word "SHIP". It looked good and told a visitor nothing. A person deciding
 * whether to hire someone needs to know what kinds of project they take on,
 * so that is what occupies the space now.
 */
export function Services() {
  return (
    <Section
      id="services"
      index="02"
      label="Services"
      title={site.services.heading}
      lead={site.services.lead}
    >
      <Stagger
        as="ul"
        stagger={0.1}
        className="mt-stack grid gap-4 md:grid-cols-3 md:gap-5"
      >
        {site.services.items.map((service, index) => (
          <StaggerItem key={service.title} as="li" className="h-full">
            <article className="flex h-full flex-col rounded-card border border-line bg-surface p-7 transition-colors duration-500 hover:border-line-strong sm:p-8">
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="font-display text-xl font-semibold text-fg">{service.title}</h3>
                <span className="eyebrow shrink-0 text-faint">
                  {String(index + 1).padStart(2, '0')}
                </span>
              </div>

              <p className="mt-4 text-base text-muted">{service.body}</p>

              <ul className="mt-7 space-y-2.5 border-t border-line pt-6">
                {service.includes.map((item) => (
                  <li key={item} className="flex gap-3 text-sm text-fg">
                    <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" />
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          </StaggerItem>
        ))}
      </Stagger>
    </Section>
  );
}
