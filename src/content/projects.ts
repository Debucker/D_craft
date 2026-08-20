/**
 * SELECTED WORK
 * -----------------------------------------------------------------------
 * The single source of truth for the Work section. Add, reorder or delete
 * entries here — the grid, tags, links and empty slots all follow.
 *
 * Ordering = display order. `featured: true` makes a card span the full
 * grid width (use it for at most two, or it stops meaning anything).
 *
 * TODO — oz-test's blurb was corrected by reading the live site directly
 * (2026-08-19): it's a certification/testing lab, not an education platform.
 * gadget-market97 and GoodGross are still best-guess descriptions — confirm
 * gadget-market97's actual feature set (catalog/payments/order processing
 * are assumed from the site category, not verified against the live site,
 * which was unreachable from this environment) and GoodGross's status.
 */

export type ProjectKind = 'placeholder' | 'project';

export type ProjectStatus =
  | 'Live'
  | 'In progress'
  | 'Ongoing'
  | 'Shipped'
  | 'Research'
  | 'Coming soon';

/** A screenshot of the work. Drop the file in `public/work/` and point at it. */
export interface ProjectShot {
  /** Path from `public/`, e.g. '/work/oz-test-home.png'. */
  readonly src: string;
  /** Describe what the screenshot shows — it is read aloud and shown if the
   *  image fails to load. "Screenshot" alone is not useful. */
  readonly alt: string;
}

export interface ProjectLink {
  readonly label: string;
  readonly href: string;
  /** Set false for internal/anchor links so we skip rel="noopener". */
  readonly external?: boolean;
}

export interface Project {
  readonly slug: string;
  readonly kind: ProjectKind;
  readonly title: string;
  /** One line. If it needs two, it needs rewriting. */
  readonly blurb: string;
  /** Longer supporting line, shown under the blurb on featured cards. */
  readonly detail?: string;
  readonly role: string;
  readonly year: string;
  readonly status: ProjectStatus;
  readonly tags: readonly string[];
  readonly links: readonly ProjectLink[];
  /**
   * Screenshots, shown as a strip on the card. Two or three per project is
   * plenty — this is a portfolio, not a gallery. Leave it off entirely and the
   * card renders exactly as it does now.
   */
  readonly shots?: readonly ProjectShot[];
  readonly featured?: boolean;
}

export const projects: readonly Project[] = [
  {
    slug: 'karvon',
    kind: 'project',
    title: 'Karvon',
    blurb: 'A self-serve travel-planning platform for Uzbekistan.',
    detail:
      'Founded and built. Turns a few prompts about dates, budget and taste into a real, bookable itinerary across the country — built on curated local data rather than generated guesses, with a marketplace side for local guides.',
    role: 'Founder & CEO · Engineering',
    year: '2025 —',
    status: 'In progress',
    tags: ['React', 'TypeScript', 'Product', 'UX', 'Marketplace'],
    links: [{ label: 'Visit site', href: 'https://karvon-19hl.onrender.com', external: true }],
    shots: [
      {
        src: '/work/karvon-home.png',
        alt: 'Karvon home page — a night sky over Uzbek architecture, with "Uzbekistan, planned properly" and a Log in button',
      },
    ],
  },
  {
    slug: 'ne-pulse',
    kind: 'project',
    title: 'Ne-pulse',
    blurb: 'A decentralised earthquake-sensing network built from everyday phones.',
    detail:
      'Turns ordinary smartphones and low-cost microcontrollers into a distributed sensing network that detects structural motion in real time — dense coverage from hardware people already own, rather than a handful of expensive seismic stations.',
    role: 'Founder · Development',
    year: '2025 —',
    status: 'In progress',
    tags: ['Sensor network', 'Real-time', 'Microcontrollers', 'Full-stack'],
    links: [
      { label: 'Visit site', href: 'https://ne-pulse.com', external: true },
      { label: 'GitHub', href: 'https://github.com/Debucker/Ne-pulse', external: true },
    ],
    shots: [
      {
        src: '/work/ne-pulse-home.png',
        alt: 'Ne-pulse home page — "Every phone is a sensor" headline over a live network telemetry panel',
      },
    ],
  },
  {
    slug: 'gadget-market97',
    kind: 'project',
    title: 'gadget-market97.ru',
    // Blurb + detail grounded in the shop's own Telegram channel copy
    // (supplied directly) rather than guessed from the domain name — it
    // sells phones and accessories from known brands, with a Telegram
    // channel driving traffic to the storefront. Left out the launch-week
    // discount promo mentioned there — time-limited, not durable case-study
    // content.
    blurb: 'An online storefront for smartphones and gadgets, backed by a Telegram sales channel.',
    detail:
      'Curated devices from established brands, direct supply lines and ongoing promotions — the storefront, product catalogue and the Telegram channel that drives sales to it, built end to end.',
    role: 'Full web development',
    year: '2025',
    status: 'Live',
    tags: ['Full-stack', 'E-commerce', 'Telegram', 'Web'],
    links: [{ label: 'Visit site', href: 'https://gadget-market97.ru', external: true }],
    // The site was unreachable from this machine's automated tooling (DNS
    // resolves, connection times out) — screenshot supplied directly rather
    // than captured live.
    shots: [
      {
        src: '/work/gadget-market97-home.png',
        alt: 'gadget-market97.ru home page — "Новый IPhone 17" hero banner with a Купить (Buy) button',
      },
    ],
  },
  {
    slug: 'oz-test',
    kind: 'project',
    title: 'oz-test.uz',
    // Corrected from an earlier guess — this is a certification and testing
    // lab's site, not an education platform. Verified by reading the live
    // site directly: product categories (electronics, EV chargers, measuring
    // instruments, transformers, textiles) each routed to certification and
    // lab-testing services.
    //
    // WORTH FIXING ON THE LIVE SITE (not a portfolio issue): the homepage
    // hero carousel still shows unedited "TemplateMo" placeholder copy —
    // "Mexant HTML5 shabloni bepul taqdim etiladi... TemplateMo saytiga
    // tashrif buyurganingiz uchun rahmat" ("this template is provided free
    // by TemplateMo, thank you for visiting") — visible to real visitors on
    // a certification lab's site. Worth swapping for real copy.
    blurb: 'The public site for a product-certification and testing laboratory.',
    detail:
      'Certification and compliance testing across electronics, EV chargers, measuring instruments, transformers and textiles — the service catalogue, categories and public-facing site, built end to end.',
    role: 'Full web development',
    year: '2025',
    status: 'Live',
    tags: ['Full-stack', 'Certification', 'Web'],
    links: [{ label: 'Visit site', href: 'https://oz-test.uz', external: true }],
    shots: [
      {
        src: '/work/oz-test-home.png',
        alt: 'oz-test.uz home page — "Mahsulotlarni sertifikatlash" (Product certification) hero over a services carousel',
      },
    ],
  },
  {
    slug: 'goodgross',
    kind: 'project',
    title: 'GoodGross',
    blurb: 'Front-end build — interface, states, and the whole responsive pass.',
    role: 'Frontend development',
    year: '2025',
    status: 'Shipped',
    tags: ['Frontend', 'UI', 'Responsive'],
    links: [],
    // No screenshot: goodgross.com currently serves a generic "Coming Soon"
    // holding page, not the actual build — a screenshot of that would
    // misrepresent the work. Add one once the real site is live there, or
    // point `links` at wherever it's actually hosted.
  },
  {
    slug: 'mun-design',
    kind: 'project',
    title: 'Model UN conferences',
    blurb: 'Lead designer across multiple MUN conferences.',
    detail:
      'Identity, print and digital for several conferences — badges, booklets, signage, social and the delegate-facing site. One visual system per conference, applied everywhere.',
    role: 'Main designer',
    year: '2024 —',
    status: 'Ongoing',
    tags: ['Design', 'Brand identity', 'Print', 'Digital'],
    links: [{ label: 'Telegram channel', href: 'https://t.me/dcraft_portfolio', external: true }],
  },
  {
    slug: 'aerial-survey',
    kind: 'project',
    title: 'Aerial survey & tree detection',
    blurb: 'A computer-vision pipeline that counts trees from drone imagery.',
    detail:
      'DeepForest-based detection over orthomosaic drone captures, wired into a single web dashboard: flight telemetry, imagery, and per-tree results in one place instead of four disconnected tools.',
    role: 'Solo · Engineering',
    year: '2025',
    status: 'Research',
    tags: ['Python', 'Computer vision', 'DeepForest', 'MAVLink', 'Dashboard'],
    links: [],
  },
  {
    slug: 'teaching',
    kind: 'project',
    title: 'Teaching programming',
    blurb: 'Getting students from "I could never" to shipping their first project.',
    detail: 'Instructor at EasyCode, a Tashkent coding school — algorithmic thinking taught through games and projects, not lectures.',
    role: 'Instructor · EasyCode',
    year: '2024 —',
    status: 'Ongoing',
    tags: ['Teaching', 'Curriculum', 'Community'],
    links: [{ label: 'EasyCode', href: 'https://easycode.uz', external: true }],
  },
  {
    slug: 'secret',
    kind: 'placeholder',
    title: 'Classified, for now',
    blurb: 'Something I am building quietly. It ships when it is ready.',
    role: '',
    year: '2026',
    status: 'Coming soon',
    tags: [],
    links: [],
  },
] as const;
