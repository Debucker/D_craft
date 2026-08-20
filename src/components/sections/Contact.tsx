import { ArrowIcon } from '@/components/icons/Arrow';
import { ContactForm } from '@/components/sections/ContactForm';
import { Reveal, Stagger, StaggerItem } from '@/components/motion/Reveal';
import { site } from '@/content/site';

export function Contact() {
  return (
    <section id="contact" className="py-section">
      <div className="shell">
        <Reveal className="flex items-baseline gap-4 border-b border-line pb-4">
          <span className="eyebrow text-faint">05</span>
          <span className="eyebrow">Contact</span>
        </Reveal>

        <div className="mt-stack grid gap-stack lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
          <div>
            <Reveal as="header">
              <h2 className="text-display max-w-[12ch] font-bold text-fg">
                {site.contact.heading}
              </h2>
            </Reveal>

            <Reveal delay={0.08}>
              <p className="mt-8 max-w-[44ch] text-lg text-muted">{site.contact.line}</p>
            </Reveal>
          </div>

          <Stagger as="ul" stagger={0.08} className="lg:pt-3">
            {site.socials.map((social) => (
              <StaggerItem key={social.href} as="li">
                <a
                  href={social.href}
                  {...(social.href.startsWith('http')
                    ? { target: '_blank', rel: 'noopener noreferrer' }
                    : {})}
                  className="group flex items-baseline justify-between gap-6 border-b border-line py-6 transition-colors duration-500 hover:border-line-strong"
                >
                  <span className="font-display text-xl text-fg transition-colors duration-300 group-hover:text-accent">
                    {social.label}
                  </span>
                  <span className="flex items-center gap-4 text-sm text-muted">
                    {social.handle}
                    <ArrowIcon
                      direction={social.href.startsWith('http') ? 'up-right' : 'right'}
                      className="text-faint transition-all duration-300 ease-out-expo group-hover:translate-x-1 group-hover:text-accent"
                    />
                  </span>
                </a>
              </StaggerItem>
            ))}
          </Stagger>
        </div>

        <div className="mt-stack">
          <ContactForm />
        </div>
      </div>
    </section>
  );
}
