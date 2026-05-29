/**
 * Content collections schema — mirrors the frontmatter that the content engine
 * emits AND the shape Payload CMS returns (see src/lib/payloadLoader.ts for
 * the field-by-field mapping).
 *
 * Loader selection at build time:
 *   - If PAYLOAD_API_URL env var is set, use the Payload loader.
 *   - Otherwise fall back to the markdown glob loader (src/content/articles/*.md).
 *   - For local dev with no Payload reachable, the glob fallback keeps you working.
 */
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { payloadLoader } from './lib/payloadLoader';

const PageTypeEnum = z.enum([
  'cost-article',
  'explainer',
  'faq',
  'comparison',
  'process-guide',
  'city-page',
  'landing',
  'pillar',
]);

const SchemaTypeEnum = z.enum([
  'Article',
  'FAQPage',
  'LegalService',
  'LocalBusiness',
  'SpeakableSpecification',
  'HowTo',
]);

const StatuteCited = z.object({
  citation: z.string(),
  url: z.string().optional(),
  last_verified: z.string().optional(),
});

// Payload CMS URL. Tries env var first (for portability across brands /
// preview deploys); falls back to the SDFLA production CMS so the build
// still pulls live content even when the build platform fails to forward
// the build-arg (we hit this on Coolify — env was in the build shell but
// not in the docker --build-arg list).
const PAYLOAD_URL = process.env.PAYLOAD_API_URL || 'https://sdfla-cms.kallada.me';

const articles = defineCollection({
  loader: PAYLOAD_URL
    ? payloadLoader({ apiUrl: PAYLOAD_URL })
    : glob({ pattern: '**/*.{md,mdx}', base: './src/content/articles' }),
  schema: z.object({
    // Core identity
    title: z.string(),
    slug: z.string().optional(),
    description: z.string(),
    page_type: PageTypeEnum,

    // SEO + Open Graph
    og_title: z.string().optional(),
    og_description: z.string().optional(),
    og_image: z.string().optional(),
    featured_image: z.string().optional(),
    twitter_card: z.string().optional().default('summary_large_image'),

    // Dates + authorship
    date_published: z.string().optional(),
    date_reviewed: z.string().optional(),
    reviewed_by: z.string().optional(),

    // AI disclosure
    ai_assisted: z.boolean().optional().default(true),
    ai_assisted_disclosure: z.string().optional(),

    // Schema metadata
    schema_types: z.array(SchemaTypeEnum).optional().default(['Article']),
    speakable_selectors: z.array(z.string()).optional(),

    // Pillar marker
    is_pillar: z.boolean().optional().default(false),

    // Jurisdictional context
    geographic_focus: z.string().optional(),
    jurisdiction: z.string().optional().default('CA'),

    // Citation list (rendered in Sources section if present)
    statutes_cited: z.array(StatuteCited).optional().default([]),

    // For comparison pages: structured options. All fields optional so
    // non-comparison articles (which don't populate this group) still validate.
    comparison: z.object({
      a: z.object({
        kicker: z.string().optional(),
        name: z.string().optional(),
        statuteBasis: z.string().optional(),
        summary: z.string().optional(),
        whenItFits: z.array(z.string()).optional(),
      }).optional(),
      b: z.object({
        kicker: z.string().optional(),
        name: z.string().optional(),
        statuteBasis: z.string().optional(),
        summary: z.string().optional(),
        whenItFits: z.array(z.string()).optional(),
      }).optional(),
    }).optional(),

    // For FAQ pages: structured Q&A list (optional, otherwise extracted from body H3s)
    faq_items: z.array(z.object({
      question: z.string(),
      answer: z.string(),
    })).optional(),

    // For process guide: structured steps. Title/body relaxed to optional
    // to match the loosened Payload schema.
    process_steps: z.array(z.object({
      title: z.string().optional(),
      body: z.string().optional(),
      duration: z.string().optional(),
      form: z.string().optional(),
      cost: z.string().optional(),
    })).optional(),

    // Order on the index page; lower numbers appear first
    order: z.number().optional().default(100),
  }),
});

export const collections = { articles };
