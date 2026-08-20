/**
 * SITE METADATA + ALL PAGE COPY
 * -----------------------------------------------------------------------
 * Everything a human would want to reword lives here. Components read from
 * this file and never hard-code copy. Edit freely — the types will tell you
 * if you break something.
 *
 * House rule for this file: write it the way you'd explain your work to a
 * person who is deciding whether to hire you. Concrete over clever. Say what
 * the thing is, who it was for, and what you did on it.
 */

export interface SocialLink {
  /** Shown in the contact list and the footer. */
  readonly label: string;
  /** The bit rendered in muted text next to the label (handle, address...). */
  readonly handle: string;
  readonly href: string;
}

export interface Service {
  readonly title: string;
  /** Two or three plain sentences. What it is, and what the client gets. */
  readonly body: string;
  /** Concrete deliverables — rendered as a short list. */
  readonly includes: readonly string[];
}

export interface SiteConfig {
  readonly name: string;
  readonly shortName: string;
  /** Used for <title> templates and the nav wordmark. */
  readonly role: string;
  readonly location: string;
  /** Canonical production URL — update before you deploy to Vercel. */
  readonly url: string;
  readonly email: string;
  readonly hero: {
    readonly headline: readonly string[];
    readonly positioning: string;
    readonly sub: string;
  };
  readonly about: {
    readonly heading: string;
    /** Each string renders as its own paragraph. */
    readonly paragraphs: readonly string[];
    readonly facts: readonly { readonly label: string; readonly value: string }[];
  };
  readonly services: {
    readonly heading: string;
    readonly lead: string;
    readonly items: readonly Service[];
  };
  readonly work: {
    readonly heading: string;
    readonly lead: string;
  };
  /** The shared sticky-note board that lives at /feedback. */
  readonly feedback: {
    readonly label: string;
    readonly heading: string;
    readonly lead: string;
    readonly cta: string;
    /** How the board works — rendered as a row of small chips. */
    readonly rules: readonly string[];
    /**
     * Text on the three notes drawn on the card. These describe what the
     * board can do — they are illustrations of the interface, NOT quotes
     * from anyone. Never put invented praise here.
     */
    readonly preview: readonly string[];
  };
  readonly contact: {
    readonly heading: string;
    readonly line: string;
    /** Copy for the inquiry form. Field labels included — nothing is hard-coded. */
    readonly form: {
      readonly heading: string;
      readonly note: string;
      readonly name: { readonly label: string; readonly placeholder: string };
      readonly email: { readonly label: string; readonly placeholder: string };
      readonly message: { readonly label: string; readonly placeholder: string };
      readonly submit: string;
      readonly sending: string;
      readonly sent: string;
    };
  };
  readonly seo: {
    readonly title: string;
    readonly description: string;
    readonly keywords: readonly string[];
  };
  readonly socials: readonly SocialLink[];
}

export const site: SiteConfig = {
  name: 'D_craft',
  shortName: 'D_craft',
  role: 'Full-stack web developer',
  location: 'Tashkent, Uzbekistan',
  url: 'https://dcraft.dev', // TODO: your real domain before deploying
  email: 'danil.temirgaliev1@gmail.com',

  hero: {
    /** Rendered as stacked lines. Keep it to 1–2 words per line for impact. */
    headline: ['D_craft'],
    positioning: 'I build websites and web apps — design, code, database and launch.',
    sub: 'Full-stack developer working from Tashkent, the USA and remotely. I take on the whole build, so you get a finished, working site rather than a handover between three people.',
  },

  about: {
    heading: 'What I do, in plain terms.',
    paragraphs: [
      // TODO: "Danil" is your real first name, from your email and LinkedIn.
      // Delete it here if you'd rather the site stayed under D_craft alone.
      "I'm Danil, a 17-year-old full-stack developer. I build websites and web applications for clients, and I run two products of my own. I work from Tashkent, spend time in the USA, and take remote work from anywhere.",
      'I handle every layer of a build: the interface design, the front-end, the back-end, the database, and getting it deployed and running. For a client that means one person is responsible for the whole thing, and nothing gets lost between a designer, a developer and whoever set up the server.',
      'So far that has included an online gadget store, a certification and testing lab’s site, a front-end build for a commercial product, a travel-planning platform I founded, and an earthquake-detection network that runs on ordinary smartphones. Alongside the code I design brand identity and print for Model UN conferences, and I teach programming to beginners.',
      "Right now I'm applying to universities and building something new that isn't public yet.",
    ],
    facts: [
      { label: 'Based in', value: 'Tashkent · USA · Remote' },
      { label: 'Role', value: 'Full-stack developer' },
      { label: 'Available for', value: 'Freelance & new projects' },
      { label: 'Currently', value: 'Applying to universities' },
    ],
  },

  services: {
    heading: 'How I can help.',
    lead: 'Most of my work falls into three kinds of project. If yours looks like one of these, get in touch and I will tell you honestly whether I am the right person for it.',
    items: [
      {
        title: 'Websites & web apps',
        body: 'A complete build, start to finish. You describe what the site needs to do; I design it, write the front-end and back-end, set up the database, and put it live on a domain you own.',
        includes: [
          'Design and build from scratch',
          'Online stores and booking flows',
          'Admin panels and dashboards',
          'Works properly on phones',
          'Deployment and handover',
        ],
      },
      {
        title: 'Front-end development',
        body: 'You already have a design, or a back-end team, and need the interface built properly. I turn designs into fast, responsive, accessible pages that behave the way they should on real devices.',
        includes: [
          'Designs turned into working pages',
          'React and Next.js applications',
          'Responsive and accessible markup',
          'Performance and load-speed work',
        ],
      },
      {
        title: 'Product & design',
        body: 'Work that starts before the code does. I have founded and built my own products, so I can help decide what to make as well as make it — and I design brand identity and print when a project needs it.',
        includes: [
          'Product direction and scoping',
          'Interface and visual design',
          'Brand identity, print and digital',
          'Prototypes for testing an idea',
        ],
      },
    ],
  },

  work: {
    heading: 'Projects I have built.',
    lead: 'Client projects and products I founded. Each entry says what the project is, what I did on it, and where you can see it.',
  },

  feedback: {
    label: 'Feedback',
    heading: 'Tell me what you think.',
    lead: 'I keep a shared board of sticky notes. Write one about my work, this site, or anything you reckon I should hear — then drag it wherever you like and read what everyone else has pinned up.',
    cta: 'Open the feedback board',
    rules: ['One note each', 'Everyone can read it', 'Yours stays yours to edit'],
    preview: ['Drag me anywhere', 'Draw, doodle, highlight', 'Your note goes here'],
  },

  contact: {
    heading: "Let's work together.",
    line: 'Available for freelance work and new projects. Tell me what you need built and I will reply with an honest answer on whether I can do it, roughly how long it would take, and what it would cost.',
    form: {
      heading: 'Tell me about your project',
      note: 'Opens in your mail app with everything filled in — nothing is stored on this site.',
      name: { label: 'Name', placeholder: 'Your name' },
      email: { label: 'Email', placeholder: 'you@example.com' },
      message: {
        label: 'What do you need built?',
        placeholder: 'A short description of the project, and a rough deadline if you have one.',
      },
      submit: 'Send inquiry',
      sending: 'Opening your mail app…',
      sent: 'Your mail app should be open — if not, write to me directly at the address above.',
    },
  },

  seo: {
    title: 'D_craft — Full-stack web developer',
    description:
      'Full-stack web developer working from Tashkent, the USA and remotely. I design and build websites, online stores and web applications end to end — founder of Karvon and Ne-pulse. Available for freelance work.',
    keywords: [
      'full-stack developer',
      'web developer',
      'freelance web developer',
      'website development',
      'front-end developer',
      'React developer',
      'Next.js',
      'TypeScript',
      'Tashkent',
      'Uzbekistan',
      'remote developer',
    ],
  },

  socials: [
    {
      label: 'Email',
      handle: 'danil.temirgaliev1@gmail.com',
      href: 'mailto:danil.temirgaliev1@gmail.com',
    },
    { label: 'Telegram', handle: '@D_craft', href: 'https://t.me/D_craft' },
    {
      label: 'LinkedIn',
      handle: '/in/danil-temirgaliev',
      href: 'https://www.linkedin.com/in/danil-temirgaliev-6a5b58369/',
    },
  ],
} as const;

/** Section anchors — single source of truth for nav links and section ids. */
export const navSections = [
  { id: 'work', label: 'Work' },
  { id: 'about', label: 'About' },
  { id: 'services', label: 'Services' },
  { id: 'stack', label: 'Stack' },
  { id: 'contact', label: 'Contact' },
] as const;

export type NavSectionId = (typeof navSections)[number]['id'];
