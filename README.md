# San Diego Family Law Advocates — Astro Template

A reference Astro template designed to render content-engine markdown output
with a refined coastal-professional design language. Drop-in ready for a
California family-law firm; clean to fork-and-rebrand for adjacent verticals.

**Live preview:** https://sdfamilylaw.kallada.me

---

## What's inside

A complete Astro 5 static site that renders 7 page types from the engine's markdown output:

| Page type | Layout treatment |
|---|---|
| **Cost article** | Centered editorial column with pull-quote callouts for cost ranges |
| **Explainer** | Centered column with statute marginalia cards linking to leginfo |
| **FAQ** | Interactive accordion (`<details>`-based, no JS dependency) |
| **Comparison** | Split-spread Option A vs Option B with statute basis + when-it-fits lists |
| **Process guide** | Vertical numbered timeline with form-number + cost + duration pills |
| **City page** | Hero with hand-drawn SVG San Diego map (real courthouse markers) |
| **Pillar guide** | Sticky TOC sidebar with reading-progress IntersectionObserver |
| **Landing** | Photo-led hero, credibility plate, intent router, practice-area grid, CTA block |

Plus shared chrome:

- Sticky header with scroll-state, click-to-call, primary CTA
- Dark navy multi-column footer
- CTA block matching the client's approved closing pattern (firm name + hours + free consultation + intake form URL)
- JSON-LD schema injection (Article / FAQPage / LegalService / LocalBusiness / SpeakableSpecification / HowTo)
- Internal link resolver (`{{internal_link_placeholder: topic}}` → real `<a>` via fuzzy slug match)
- Sitemap + Open Graph + Twitter card metadata
- In-browser admin preview at `/admin` for editing firm.config.json values

## Design language

**"Refined Coastal Professional"** — modern law-firm site that doesn't suck.

| Layer | Decision |
|---|---|
| Ground | Soft warm white `#FBFAF7` (never pure white) |
| Ink | Deep navy-black `#0F1A2E` body, `#3F4A5E` secondary |
| Primary brand | Deep coastal navy `#1F3A4D` |
| Warm accent | Muted terracotta `#C56B4B` — used sparingly (CTA, rules, callouts) |
| Display | **Bricolage Grotesque** variable (Fontshare CDN) — uses WONK axis for warmth |
| Body | **General Sans** variable (Fontshare CDN) |
| Mono | **Geist Mono** (Google Fonts) — for statute codes, metadata pills |

Deliberately not: navy + gold legal cliché, stock-photo couples, Inter, purple gradients, glass-morphism.

---

## Quick start

### Prerequisites

- Node 20+ (Node 22 recommended)
- npm 10+

### Local development

```sh
npm install
npm run dev
# → http://localhost:4321
```

### Build for production

```sh
npm run build
# → dist/ (fully static; no server runtime needed)
```

### Docker build (used by Coolify deploy)

```sh
docker build -t sdfla-template .
docker run -p 8080:80 sdfla-template
# → http://localhost:8080
```

---

## Customizing for a different firm

### 1. Update `firm.config.json`

This is the single source of truth for firm-specific values. The template's TypeScript types come from this file directly, so the schema is self-documenting.

Required fields:
- `firm.name`, `firm.shortName`, `firm.tagline`
- `firm.phone`, `firm.phoneDisplay`, `firm.hours`, `firm.consultationOffer`, `firm.intakeUrl`
- `firm.address.{street,city,state,postalCode}`
- `firm.geoLat`, `firm.geoLng` (for LocalBusiness schema)
- `firm.primaryAreasServed`
- `attorney.{name,title,barState,barNumber,admissionYear,stateBarProfileUrl}`
- `practiceAreas[]` (slug + title + summary)
- `navigation.primary[]`
- `credentials[]` (label + imageSlot for logo file in `/public/credentials/`)

**For non-California firms,** update `firm.address.state` and `attorney.barState`, replace any leginfo URLs in sample articles with the equivalent statute repository for your jurisdiction, and adjust `LegalService` schema in `src/lib/schema.ts` if needed.

### 2. Tune the design tokens

Edit the top of `src/styles/global.css`. Tokens are CSS variables — colors, fonts, type scale, spacing, animation, all in one place. Change `--color-accent` and `--color-accent-warm` to rebrand quickly.

### 3. Add or remove practice areas

Edit `practiceAreas[]` in `firm.config.json`. The card grid on the landing page and the footer column read from this array.

### 4. Replace placeholder credentials

Drop SVG logos into `public/credentials/` matching the `imageSlot` filenames declared in `firm.config.json` (e.g., `calbar.svg`, `superlawyers.svg`).

### 5. Add new articles

Drop markdown files into `src/content/articles/`. Each article needs YAML frontmatter matching the schema in `src/content.config.ts`. The dynamic router at `src/pages/articles/[...slug].astro` picks the right layout based on `page_type`.

Supported `page_type` values:
- `cost-article`
- `explainer`
- `faq` (uses `faq_items` array for accordion)
- `comparison` (uses `comparison.a` + `comparison.b` for split-spread)
- `process-guide` (uses `process_steps` array for timeline)
- `city-page`
- `pillar` (uses TOC layout)
- `landing`

---

## Adding a real admin (CMS)

The included `/admin` page is a static **preview tool** — it lets you edit `firm.config.json` values in the browser and download the updated JSON. It does not persist changes to disk.

For a real admin with persistence, drop in one of these:

### Option A: Decap CMS (recommended, free, OSS)

[Decap CMS](https://decapcms.org/) (formerly Netlify CMS) is the go-to git-based CMS for static sites. It runs entirely in the browser, edits files via the GitHub API with OAuth login, and triggers a Coolify rebuild on commit.

Setup outline:
1. `npm install decap-cms` and copy the bundle into `public/admin/`
2. Create `public/admin/config.yml` describing your collections (articles, firm config)
3. Set up a GitHub OAuth app (15 minutes)
4. Configure `backend.repo` to point at your repo
5. Access at `/admin/` after login

Decap's article collection schema should mirror `src/content.config.ts` exactly.

### Option B: Sveltia CMS (modern Decap fork)

[Sveltia CMS](https://github.com/sveltia/sveltia-cms) is a Decap-compatible drop-in with a modern UI and better TypeScript support. Same setup pattern, nicer admin.

### Option C: Tina CMS (paid for collaboration, free self-hosted)

[TinaCMS](https://tina.io/) offers visual block-based editing and integrates more deeply with Astro. Higher setup cost but better editor UX.

### Option D: Headless Sanity / Contentful / Storyblok

If the firm already uses a headless CMS, point Astro's content collection loader at that CMS API instead of the markdown file loader. The schema in `src/content.config.ts` adapts cleanly.

---

## Architecture notes

### Static output

Every page is statically rendered at build time. There is no server runtime, no API routes, no database. This means:
- Deploy anywhere static files can be served (Cloudflare Pages, Vercel, Netlify, S3 + CloudFront, any nginx, Coolify)
- No backend security surface; no API keys to leak
- Fast: static HTML compresses to ~20-25 KB per page

### Content collections

The articles collection uses Astro's glob loader pattern, which is the modern (Astro 5+) replacement for the legacy content folder convention. Schema is enforced at build time — a malformed frontmatter field fails the build with a clear error.

### Internal link resolver

When the content engine emits `{{internal_link_placeholder: <topic>}}` tokens, the resolver (`src/lib/resolveInternalLinks.ts`) matches each token against the article collection's titles and slugs using a three-stage fuzzy strategy: exact normalized match → containment → token overlap with 60% threshold. Unresolved tokens render as plain text with a `data-topic` attribute and log a build warning.

To audit link health, the `buildLinkManifest()` function produces a list of resolved + unresolved tokens across the entire collection. Drop that into the `/admin` page to surface broken-link reports.

### JSON-LD schema

Schema injection lives in `src/lib/schema.ts`. The `buildSchemas()` function reads `data.schema_types` from frontmatter and composes the appropriate JSON-LD objects. These are injected by `BaseLayout.astro` as `<script type="application/ld+json">` blocks in `<head>`.

### Performance

Build time: ~3-4 seconds for 8 pages. Cold-cache page load: ~25 KB compressed. No JavaScript framework runtime ships to the browser — only a tiny hydration script for the TOC IntersectionObserver and the admin preview.

---

## Deploy

### Coolify (current preview deploy)

The included `Dockerfile` is a multi-stage build (node 22-alpine → nginx 1.27-alpine). Coolify points at this repo, builds with the Dockerfile, and serves via Traefik with auto-HTTPS.

Auto-redeploy on push to `main`.

### Cloudflare Pages

1. Connect this repo to Cloudflare Pages
2. Build command: `npm run build`
3. Output directory: `dist`
4. Done.

### Vercel

1. `vercel link` then `vercel`
2. Astro adapter is auto-detected.

### S3 + CloudFront

`npm run build` then sync `dist/` to your bucket. The `nginx.conf` rules for caching translate to CloudFront cache behaviors directly.

### nginx on a VPS

`npm run build`, scp `dist/` to the server, point nginx at it with the rules from `nginx.conf`.

---

## Project structure

```
sd-family-law-astro-template/
├── firm.config.json           ← single source of truth for firm values
├── Dockerfile                 ← multi-stage build + nginx serve
├── nginx.conf
├── astro.config.mjs
├── package.json
├── tsconfig.json
├── public/
│   └── credentials/           ← drop credential logo SVGs here
└── src/
    ├── components/
    │   ├── ArticleIndex.astro     ← grid of all articles on home
    │   ├── Byline.astro           ← reviewer credit under H1
    │   ├── ComparisonSpread.astro ← split-spread for comparison articles
    │   ├── CTABlock.astro         ← Steve-approved closing CTA
    │   ├── Credentials.astro      ← horizontal credentials strip
    │   ├── FAQAccordion.astro     ← <details>-based Q&A list
    │   ├── Footer.astro           ← dark navy multi-column site footer
    │   ├── FootBlock.astro        ← legal foot block (Advertising/About/Disclaimer)
    │   ├── Header.astro           ← sticky header
    │   ├── Hero.astro             ← landing page hero
    │   ├── PageHeader.astro       ← top-of-article header (kicker + title + byline)
    │   ├── PracticeAreaGrid.astro ← 8-card practice areas
    │   ├── ProcessTimeline.astro  ← vertical numbered timeline
    │   ├── PullQuote.astro        ← editorial pull quote variants
    │   ├── SanDiegoMap.astro      ← hand-drawn SVG region map
    │   ├── SourcesList.astro      ← Sources section
    │   ├── StatuteCard.astro      ← inline statute callout
    │   ├── TableOfContents.astro  ← pillar sidebar TOC with IntersectionObserver
    │   └── WhereToStart.astro     ← three-card intent router on landing
    ├── content/
    │   └── articles/              ← markdown articles (drop more here)
    ├── content.config.ts          ← collection schema (matches engine frontmatter)
    ├── layouts/
    │   ├── ArticleLayout.astro    ← default for cost / explainer / FAQ / city
    │   ├── BaseLayout.astro       ← <html> shell + meta + JSON-LD injection
    │   └── PillarLayout.astro     ← TOC sidebar variant
    ├── lib/
    │   ├── firmConfig.ts          ← typed accessor for firm.config.json
    │   ├── resolveInternalLinks.ts ← fuzzy slug matcher for {{...}} tokens
    │   └── schema.ts              ← JSON-LD builders
    ├── pages/
    │   ├── admin/
    │   │   └── index.astro        ← preview admin (no backend)
    │   ├── articles/
    │   │   └── [...slug].astro    ← dynamic router for all article types
    │   └── index.astro            ← landing page
    └── styles/
        └── global.css             ← design tokens + base styles
```

---

## License

MIT — fork freely. Attribution appreciated but not required.
