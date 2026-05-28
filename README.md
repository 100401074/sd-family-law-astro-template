# San Diego Family Law Advocates — Astro Template

Reference Astro template for a California family-law firm. Renders the markdown
articles produced by the content engine with a refined coastal-professional design.

## Status

**Work in progress — preview deploy for client review.**

Currently shipped:
- ✅ Design system: Bricolage Grotesque + General Sans + Geist Mono, warm-cream / deep-navy / terracotta palette
- ✅ Sticky header with click-to-call + primary CTA
- ✅ Dark-navy multi-column footer
- ✅ Full landing page: hero, credentials strip, intent router, practice-area grid, approach section, CTA block (matches client's approved CTA pattern)

In progress:
- Article layouts for the 7 content-engine page types (cost, faq, comparison, explainer, process guide, city page, pillar)
- Shared article components (byline, statute callouts, pull quotes, foot block, FAQ accordion, comparison spread, process timeline)
- Content collection schema + sample articles
- JSON-LD schema injection (Article / FAQPage / LegalService / LocalBusiness / SpeakableSpecification)
- Internal-link resolver

## Local development

```sh
npm install
npm run dev
```

Visit `http://localhost:4321`.

## Build

```sh
npm run build
```

Output goes to `dist/` (fully static, no server runtime needed).

## Production deploy

The included `Dockerfile` builds the Astro static site and serves it with nginx
on port 80. Used by the Coolify deploy.

```sh
docker build -t sdfla-template .
docker run -p 8080:80 sdfla-template
```

## Customizing

All firm-specific values live in [`firm.config.json`](firm.config.json):

- Firm name, phone, hours, intake URL, consultation-offer copy
- Reviewing attorney (name, bar number, admission year, State Bar profile URL)
- Credential labels
- Practice areas (slug, title, summary)
- Primary navigation
- Address + service-area neighborhoods

Edit that one file and the values propagate site-wide.

Design tokens live in [`src/styles/global.css`](src/styles/global.css) at the top
as CSS variables — colors, fonts, type scale, spacing, animation.

## Project structure

```
sd-family-law-astro-template/
├── firm.config.json        ← single source of truth for firm values
├── Dockerfile              ← multi-stage build + nginx serve
├── nginx.conf
├── astro.config.mjs
├── package.json
├── tsconfig.json
└── src/
    ├── components/         ← Header, Footer, Hero, CTABlock, etc.
    ├── content/articles/   ← markdown articles (content collection)
    ├── layouts/            ← BaseLayout + per-page-type layouts
    ├── lib/firmConfig.ts   ← typed accessor for firm.config.json
    ├── pages/              ← routes (index.astro = landing)
    └── styles/global.css   ← design tokens + base styles
```

## Design language

**"Refined Coastal Professional"** — modern law-firm site that doesn't suck.
Warm-cream ground (`#FBFAF7`), deep coastal navy primary (`#1F3A4D`), terracotta
accent (`#C56B4B`) used sparingly. Bricolage Grotesque display, General Sans body,
Geist Mono for statute codes and metadata.

Deliberately NOT: navy + gold legal cliché, stock-photo couples, Inter, purple
gradients, glass-morphism. The empathetic-guide voice from the content engine
gets a typographic body that earns it.
