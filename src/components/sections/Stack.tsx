import { Section } from '@/components/layout/Section';
import { Stagger, StaggerItem } from '@/components/motion/Reveal';
import { stack } from '@/content/stack';

export function Stack() {
  return (
    <Section
      id="stack"
      index="04"
      label="Stack"
      title="Tools I work with."
      lead="The tools I actually use day to day, grouped by what I use them for."
    >
      <Stagger as="ul" stagger={0.1} className="mt-stack grid gap-px overflow-hidden rounded-card border border-line bg-line md:grid-cols-2">
        {stack.map((group, index) => (
          <StaggerItem
            key={group.title}
            as="li"
            className={`bg-bg p-7 sm:p-9 ${
              // An odd group count leaves a lone last item in a 2-col grid —
              // span it full width instead of leaving the cell beside it empty.
              stack.length % 2 === 1 && index === stack.length - 1 ? 'md:col-span-2' : ''
            }`}
          >
            <h3 className="font-display text-lg font-medium text-fg">{group.title}</h3>
            <p className="mt-2 text-sm text-muted">{group.note}</p>

            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-3">
              {group.items.map((item) => (
                <li
                  key={item}
                  className="group/item flex items-center gap-2 text-sm text-fg transition-colors duration-300 hover:text-accent"
                >
                  <span
                    aria-hidden
                    className="h-1 w-1 shrink-0 rounded-full bg-faint transition-colors duration-300 group-hover/item:bg-accent"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </StaggerItem>
        ))}
      </Stagger>
    </Section>
  );
}
