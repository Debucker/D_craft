# Screenshots

Drop image files in this folder, then list them on the matching project in
`src/content/projects.ts`:

```ts
shots: [
  { src: '/work/oz-test-home.png', alt: 'oz-test.uz home page with the subject list' },
  { src: '/work/oz-test-result.png', alt: 'A finished test showing the score breakdown' },
],
```

The path is written from `public/`, so a file saved here as
`public/work/oz-test-home.png` is referenced as `/work/oz-test-home.png`.

Notes:

- **Two or three per project is plenty.** The strip is a taster; the live link
  is the real proof.
- **Write a real `alt`.** It is read aloud to anyone using a screen reader and
  shown if the image fails to load. Describe what is on screen — "Screenshot"
  tells nobody anything.
- **Any format works** (`.png`, `.jpg`, `.webp`). WebP is smallest; PNG is
  sharpest for UI. Aim for roughly 1600px wide and under ~300KB each — the
  cards render them small, and every image is a download for the visitor.
- Images load lazily and only when scrolled to, so extra ones cost nothing
  until someone reaches that card.
