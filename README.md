# D_craft — Portfolio

A hand-built personal site. Dark, editorial, fast. No UI kit, no template.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · Framer Motion · Lenis
**Deploy target:** Vercel

---

## Run it

```bash
npm install
```

```bash
npm run dev
```

Opens on **http://localhost:3007**.

| Script              | What it does                                  |
| ------------------- | --------------------------------------------- |
| `npm run dev`       | Dev server on port 3007                       |
| `npm run build`     | Production build (fully static)               |
| `npm start`         | Serve the production build                    |
| `npm run lint`      | ESLint (flat config, `next/core-web-vitals`)  |
| `npm run typecheck` | `tsc --noEmit`, strict, no `any`              |

---

## Where to edit copy

**All content lives in `src/content/`. You should never need to open a component to change words.**

| File                     | What's in it                                                                                                                  |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `src/content/site.ts`    | Name, role, location, **email**, **social links**, SEO title/description, hero copy, About paragraphs + facts, Services, Work intro, contact + form copy, nav sections |
| `src/content/projects.ts`| The Selected Work grid — one typed object per project                                                                          |
| `src/content/stack.ts`   | Skills, grouped by what you use them for                                                                                       |

### Before you deploy

In `src/content/site.ts`, marked `TODO`:

1. `url` — your real domain (drives canonical URL + Open Graph). Still a placeholder.

Email, Telegram and LinkedIn in `socials` are real and wired up.

In `src/content/projects.ts`, also marked `TODO`: the blurbs, years and
statuses on the client builds are inferred from the domain names — correct
them. Karvon has no public URL set yet, so its card renders without a link.

### Adding a project

Append to the array in `src/content/projects.ts`. The grid, tags, status chip and links all follow automatically:

```ts
{
  slug: 'my-thing',          // unique, used as the React key
  kind: 'project',           // 'placeholder' renders the dashed empty-slot card
  title: 'My Thing',
  blurb: 'One line. If it needs two, it needs rewriting.',
  detail: 'Optional longer paragraph, shown under the blurb.',
  role: 'Solo · Engineering',
  year: '2026',
  status: 'Live',            // Live | In progress | Ongoing | Shipped | Research | Coming soon
  tags: ['TypeScript', 'Next.js'],
  links: [{ label: 'Visit site', href: 'https://…', external: true }],
  featured: true,            // spans the full grid width — use for at most two
}
```

Two `kind: 'placeholder'` entries are seeded at the end as intentional empty slots. Replace or delete them.

---

## File structure

```
src/
├── app/
│   ├── layout.tsx            Fonts, metadata, Open Graph, nav/footer, skip link, grain
│   ├── page.tsx              Section order + JSON-LD Person schema
│   ├── globals.css           ⭐ The entire design system (see below)
│   ├── icon.svg              Favicon — the monogram on a dark rounded square
│   └── opengraph-image.tsx   Social card, generated at build time from site.ts
│
├── lib/
│   ├── notes.ts              Notes storage — ⚠️ localStorage, see below
│   └── profanity.ts          Filter for the notes board
│
├── content/                  ⭐ ALL COPY LIVES HERE
│   ├── site.ts
│   ├── projects.ts
│   └── stack.ts
│
├── components/
│   ├── brand/
│   │   ├── Logo.tsx          The monogram + orbiting dot (animated SVG)
│   │   ├── OrbitField.tsx    Hero visual — the mark's orbit, opened out
│   │   ├── AnimatedFavicon.tsx  Canvas favicon, dot orbiting in the tab
│   │   └── Wordmark.tsx      Mark + "D_craft" lockup for the nav
│   ├── layout/
│   │   ├── Nav.tsx           Fixed nav, blurs in after 32px of scroll
│   │   ├── Footer.tsx
│   │   └── Section.tsx       Shared editorial frame: index rule → heading → lead
│   ├── motion/
│   │   ├── SmoothScroll.tsx  Lenis + correct anchor handling
│   │   └── Reveal.tsx        Reveal / Stagger / StaggerItem primitives
│   └── sections/
│       ├── Hero.tsx
│       ├── About.tsx
│       ├── Services.tsx      What I do — replaced the big "SHIP" moment
│       ├── Work.tsx
│       ├── ProjectCard.tsx
│       ├── Stack.tsx
│       ├── Contact.tsx
│       └── ContactForm.tsx  Name / email / inquiry form over a hairline grid
│
├── lib/motion.ts             Shared easings, timings, viewport thresholds
└── types/assets.d.ts         CSS side-effect import declaration (TS 6)
```

---

## Design system — `src/app/globals.css`

Everything is a token. There is no hard-coded colour or font size in any component.

### Swapping the accent — one line

Top of `globals.css`:

```css
:root {
  --accent: #e8b84b;   /* amber (default) */
  /* --accent: #9b7bff;   plasma violet */
  /* --accent: #ff6b35;   signal orange */
}
```

That single variable drives the logo's orbiting dot, CTAs, hover states, link underlines, the pointer glow, focus rings and text selection. It's declared with `@theme inline`, so `text-accent`, `bg-accent`, `border-accent/30` all resolve straight to it.

### Tokens

| Group   | Tokens                                                                                     |
| ------- | ------------------------------------------------------------------------------------------ |
| Colour  | `bg` `surface` `surface-2` `line` `line-strong` `fg` `muted` `faint` `accent`               |
| Type    | `text-2xs` → `text-2xl`, then `text-section` `text-display` `text-hero` (all fluid `clamp`) |
| Fonts   | `font-display` (Space Grotesk) · `font-sans` (Inter) · `font-mono`                          |
| Space   | `p-gutter` `py-section` `gap-block`                                                         |
| Width   | `max-w-shell` (82rem) · `max-w-prose` (46rem)                                               |
| Shape   | `rounded-card` (14px) · `rounded-pill`                                                      |
| Easing  | `ease-out-expo` `ease-out-quint` `ease-in-out-soft`                                         |

Custom utilities: `.shell` (page container), `.eyebrow` (small-caps label), `.link-draw` (accent underline that draws in on hover/focus).

### Colour contrast

All text passes **WCAG AA**. Audited in-browser across 120 text elements — lowest ratio **4.86:1**, zero failures.

`--color-faint` is set to `#82828a` deliberately. The darker grey it looks like it wants to be (`#5c5c62`) measures 2.9:1 and fails on every surface. If you darken it, re-check the section indices and placeholder cards.

---

## Motion system

| Effect             | Where                | How                                                        |
| ------------------ | -------------------- | ---------------------------------------------------------- |
| Hero enter         | `Hero.tsx`           | Staggered fade + rise on mount                             |
| Logo               | `Logo.tsx`           | The "D" stroke-draws; the dot runs one elliptical orbit, then rests |
| Section reveals    | `Reveal.tsx`         | Framer `whileInView`, `once: true`, staggered for lists     |
| Smooth scroll      | `SmoothScroll.tsx`   | Lenis, writing to real `scrollTop`                          |
| Hero core glow     | `OrbitField.tsx`     | Accent light pinned behind the galaxy core (was pointer-following) |
| Card hover         | `ProjectCard.tsx`    | Lift + border shift + accent hairline drawing across the top |
| Link hover         | `.link-draw`         | Underline scales in from the left                           |
| Hero orbit field   | `OrbitField.tsx`     | 6 rings, 9 bodies + a moon, starfield, turning rim — one `useTime` clock |

### The hero orbit field

`OrbitField.tsx` fills the right half of the hero. It is the mark's own
geometry opened out: six rings at the identical −12° tilt carrying nine bodies
(one with its own moon) around a lit core, over a starfield, under a rim that
turns once every four minutes. Same technique as `Logo.tsx` — one angle mapped
through cos/sin into translate x/y — so every body moves on transform alone.
Opacity on the twinkling stars is the only other animated property.

Periods are all primes (11/17/23/31/43/59s), so the arrangement does not repeat
for ~10.7 years. `useTime` is a monotonic clock, so there is no restart seam.
Two rings carry a pair of bodies, which is what stops it reading as a tidy
one-dot-per-ring diagram.

The starfield uses a **seeded** PRNG, never `Math.random()` — the server and
the client must generate identical stars or React reports a hydration mismatch.

The accent glow behind the core is the light that used to trail the pointer
across the hero. It is a sibling of the SVG, centred on the same box, so it
tracks the field at any size.

Hidden below `lg`: on a phone the copy already fills the screen and a 400px
graphic would only push the CTAs under the fold.

### The contact form

`ContactForm.tsx`. The site is fully static with no backend, so the form does
not POST anywhere — it validates, then composes a pre-filled draft and hands it
to the visitor's mail client. The message reaches the inbox for real, and no
third-party form service ever sees anyone's address.

To move to a real endpoint later, replace the body of `submit()` with your
fetch. The validation, error state, focus handling and status region around it
stay exactly as they are.

### Adding screenshots to a project

Drop image files in `public/work/`, then list them on the project in
`src/content/projects.ts`:

```ts
shots: [
  { src: '/work/oz-test-home.png', alt: 'oz-test.uz home page with the subject list' },
],
```

Rendered with `next/image` (`fill` + a `sizes` hint matching the card grid), so
phones never download a desktop-width file and nobody has to record pixel
dimensions in the content file. Each shot links to the original. Two or three
per project is plenty. See `public/work/README.md` for the full notes.

### The guardrails, and how they're actually enforced

**Transform and opacity only.** The orbiting dot is one `angle` MotionValue mapped through `cos`/`sin` into `translate x/y` — not animated `cx`/`cy`. The signature word tracks via a per-letter `translateX`, not animated `letter-spacing`, which would relayout the line every frame. The travelling dot rides a full-width track translated by a percentage, not an animated `left`. The orbit field drives nine bodies, a moon and a turning rim from a single `useTime` clock rather than nine independent loops.

*(One deliberate exception: the logo's `pathLength` draw is a stroke-dashoffset animation. It's paint-only on a 64px SVG, runs once on mount, and never touches layout.)*

**`prefers-reduced-motion` is respected everywhere.** Not just a CSS media query — `Reveal`, `Stagger`, `Logo`, `Hero`, `OrbitField` and `AnimatedFavicon` each call Framer's `useReducedMotion()` and render the static branch. **Lenis is never instantiated at all**, so scrolling and anchor jumps fall back to the browser's native instant behaviour.

**Anchor links still jump correctly.** Lenis and native anchor jumps fight each other, so `SmoothScroll` intercepts in-page `#` links and routes them through `lenis.scrollTo` — then updates the URL hash *and* moves keyboard focus to the target (`tabindex="-1"`, `preventScroll`), which a naive smooth-scroll setup silently drops. Modified clicks (⌘/Ctrl/Shift/Alt), `target="_blank"`, downloads, and unknown targets are all left to the browser. Under reduced motion the interceptor isn't attached and `[id] { scroll-margin-top: 6rem }` keeps sections clear of the fixed nav.

### Performance decisions worth not undoing

**Lenis was removed.** It was the largest source of input latency on the page:
it intercepted the wheel and animated `scrollTop` over 1.05s, so the page
always trailed the user's finger by about a second. Scrolling is now entirely
native — `scroll-behavior: smooth` for anchors, nothing running per frame.
`AnchorFocus.tsx` only moves keyboard focus to the target and never calls
preventDefault. Do not reintroduce a scroll-hijacking library.

**The favicon caches its frames.** `AnimatedFavicon` renders the loop once into
44 data URLs during idle time, then cycles them. The first version called
`canvas.toDataURL()` on every tick — a synchronous PNG encode on the main
thread, 25 times a second, forever.

**The grain layer is `inset: 0`, not `-100%`.** At -100% it was three viewports
in each direction — nine screens of texture permanently composited — and it
carried a `will-change: transform` for an animation that does not exist.

**Star twinkle is a CSS keyframe**, not a JS animation per star, so the
compositor runs it and the main thread never sees it.

**Motion never blocks reading.** The page is statically prerendered; all animation is progressive enhancement over already-painted HTML.

---

## The logo

`src/components/brand/Logo.tsx` — inline SVG, so it can animate and inherit `currentColor`.

A geometric "D": a straight stem with a true semicircular bowl (chord 44 = 2 × r22), and a dot on a tilted elliptical orbit (rx 27, ry 22, −12°) that parks in the upper right, half a unit clear of the stroke.

```tsx
<Logo size={84} draw orbit delay={0.45} />   // hero: draws in, one orbit, rests
<Logo size={28} />                            // nav/footer: static, dot at rest
<Logo size={64} title="D_craft" />              // give it a title and it becomes role="img"
```

Omit `title` and the mark is `aria-hidden` — correct when it sits beside the text wordmark, so screen readers announce the name once, not twice.

Also shipped: `Wordmark.tsx` (mark + name lockup for the nav) and `app/icon.svg` (favicon — same mark on a dark rounded square, so it reads on both light and dark browser chrome).

---

## SEO & accessibility

- Full metadata: title template, description, canonical, keywords, Open Graph, Twitter card, robots
- `opengraph-image.tsx` generates a 1200×630 social card at build time from `site.ts` — no image asset to keep in sync
- JSON-LD `Person` schema, built from the same typed config
- Semantic landmarks (`header` / `nav[aria-label]` / `main` / `footer`), skip-to-content link
- One `h1`, no heading-level skips, all 15 focusable elements have accessible names
- Visible `:focus-visible` rings in the accent colour
- External links carry `rel="noopener noreferrer"` and an sr-only "(opens in a new tab)"
- The signature word's split letters are `aria-hidden`, with the word exposed once intact — otherwise a screen reader spells it out

---

## Deploy to Vercel

1. Set `url` in `src/content/site.ts` to your domain
2. Push to GitHub, import the repo in Vercel

No environment variables, no external services. `npm run build` produces a fully static site — every route prerenders.

---

## Notes

- Fonts are self-hosted by `next/font` — no render-blocking request to Google, no layout shift
- The film grain is one fixed layer painted once; it never repaints while scrolling
- First load JS is ~157 kB, most of it Framer Motion and React


---

## The notes board (`/notes`)

A cork board where visitors pin sticky notes. Linked from the nav and from the
Contact section.

- **Notes are draggable.** Framer `drag` constrained to the board, position
  written to storage on drag end (not per frame). Arrow keys nudge a focused
  note 8px, shift 32px — dragging alone is unusable by keyboard.
- **The board is a fixed 1120×720 canvas**, not a fluid box, and scrolls inside
  its frame on narrow screens. Positions are stored in board pixels, so a note
  pinned on a laptop is in the same place when reopened on a phone.
- Each note takes a colour, a pin colour and a −5°..+5° tilt from a hash of its
  id, so it looks hand-pinned but never changes between reloads.
- Note text is **Caveat** (`font-hand`), a handwriting face that stays legible.
- **2 notes per person**, `MAX_NOTES_PER_PERSON` in `src/lib/notes.ts`
- **Profanity filtered** by `src/lib/profanity.ts`, which folds evasion spellings
  ("f u c k", "a$$hole", "FUUUCK", Cyrillic) onto one spelling before matching,
  and matches whole words so "Scunthorpe", "class analysis", "shiitake" and
  "document" are not blocked
- Notes can be deleted, which frees the slot again

### ⚠️ The board is not shared

There is no backend, so notes are written to the visitor's own `localStorage`.
**A note is visible only in the browser that wrote it** — two people see two
different boards, and none of it reaches the site owner. The page says so.

To make it genuinely public, replace the four functions at the bottom of
`src/lib/notes.ts` with calls to a real endpoint; nothing above them changes.
That needs a store (Vercel KV, Upstash, Supabase and Turso all have free tiers
that suit a note wall), and **the per-person limit and the profanity check must
then be re-applied on the server** — both are enforced in the browser today,
where anyone with devtools can walk straight past them.
