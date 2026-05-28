/**
 * Payload CMS loader for Astro Content Layer.
 *
 * Fetches articles from a Payload v3 instance at build time and yields them
 * to Astro's content collection system in the same shape the markdown glob
 * loader produces. The Lexical-formatted `body` field is converted to
 * markdown so Astro's standard markdown renderer can take over from there.
 *
 * Config:
 *   - process.env.PAYLOAD_API_URL — base URL, e.g. https://sdfla-cms.kallada.me
 *   - process.env.PAYLOAD_API_KEY — optional, for collections with read auth
 *
 * If PAYLOAD_API_URL is unset OR the fetch fails, the loader yields no
 * entries (silent fallback). Combine with the glob loader to keep markdown
 * articles working when Payload is unreachable — see content.config.ts.
 */

import type { Loader, LoaderContext } from 'astro/loaders';
import { lexicalToMarkdown, type LexicalRichText } from './lexicalToMarkdown';

export interface PayloadArticleAPIResponse {
  docs: PayloadArticle[];
  totalDocs: number;
  page: number;
  totalPages: number;
  hasNextPage: boolean;
}

export interface PayloadArticle {
  id: string | number;
  title: string;
  slug: string;
  description: string;
  page_type:
    | 'cost-article'
    | 'explainer'
    | 'faq'
    | 'comparison'
    | 'process-guide'
    | 'city-page'
    | 'landing'
    | 'pillar';
  status?: 'draft' | 'review' | 'published';
  order?: number;

  // Body (Lexical rich text)
  body?: LexicalRichText | null;

  // SEO
  og_title?: string;
  og_description?: string;
  og_image?: { url?: string } | string | null;
  featured_image?: { url?: string } | string | null;
  schema_types?: string[];
  speakable_selectors?: Array<{ selector: string }>;

  // Authorship
  reviewed_by?: string;
  date_published?: string;
  date_reviewed?: string;
  ai_assisted?: boolean;
  ai_assisted_disclosure?: string;

  // Jurisdiction
  geographic_focus?: string;
  jurisdiction?: string;
  is_pillar?: boolean;
  statutes_cited?: Array<{ citation: string; url?: string; last_verified?: string }>;

  // FAQ
  faq_items?: Array<{ question: string; answer: string }>;

  // Comparison
  comparison?: {
    a: {
      kicker?: string;
      name: string;
      statuteBasis?: string;
      summary: string;
      whenItFits?: Array<{ item: string }>;
    };
    b: {
      kicker?: string;
      name: string;
      statuteBasis?: string;
      summary: string;
      whenItFits?: Array<{ item: string }>;
    };
  };

  // Process
  process_steps?: Array<{
    title: string;
    body: string;
    duration?: string;
    form?: string;
    cost?: string;
  }>;

  updatedAt?: string;
  createdAt?: string;
}

interface PayloadLoaderOptions {
  /** Base URL of the Payload CMS, e.g. https://sdfla-cms.kallada.me */
  apiUrl?: string;
  /** Optional API key for authenticated reads. */
  apiKey?: string;
  /** Where filter — defaults to status=published. Set to `{}` to fetch all. */
  where?: Record<string, unknown>;
  /** Per-page limit when fetching; loader pages through totalPages. */
  limit?: number;
}

/** Normalize a relation / media field that might be an object or a string URL. */
function flatUrl(v: unknown): string | undefined {
  if (!v) return undefined;
  if (typeof v === 'string') return v;
  if (typeof v === 'object' && v !== null && 'url' in v) {
    const u = (v as { url?: string }).url;
    return typeof u === 'string' ? u : undefined;
  }
  return undefined;
}

/** Flatten a `whenItFits` array of {item: string} → string[]. */
function flatWhenItFits(arr?: Array<{ item: string }>): string[] | undefined {
  if (!arr) return undefined;
  return arr.map((a) => a.item).filter(Boolean);
}

/** Flatten a speakable_selectors array of {selector: string} → string[]. */
function flatSelectors(arr?: Array<{ selector: string }>): string[] | undefined {
  if (!arr) return undefined;
  return arr.map((a) => a.selector).filter(Boolean);
}

/** Build an Astro collection entry from a Payload article. */
function articleToEntry(article: PayloadArticle): { id: string; data: Record<string, unknown>; body: string } {
  const body = lexicalToMarkdown(article.body);

  const data: Record<string, unknown> = {
    title: article.title,
    slug: article.slug,
    description: article.description,
    page_type: article.page_type,
    og_title: article.og_title,
    og_description: article.og_description,
    og_image: flatUrl(article.og_image),
    featured_image: flatUrl(article.featured_image),
    twitter_card: 'summary_large_image',
    date_published: article.date_published,
    date_reviewed: article.date_reviewed ?? article.updatedAt,
    reviewed_by: article.reviewed_by,
    ai_assisted: article.ai_assisted ?? true,
    ai_assisted_disclosure: article.ai_assisted_disclosure,
    schema_types: article.schema_types ?? ['Article'],
    speakable_selectors: flatSelectors(article.speakable_selectors),
    is_pillar: article.is_pillar ?? false,
    geographic_focus: article.geographic_focus,
    jurisdiction: article.jurisdiction ?? 'CA',
    statutes_cited: article.statutes_cited ?? [],
    faq_items: article.faq_items,
    process_steps: article.process_steps,
    order: article.order ?? 100,
  };

  if (article.comparison) {
    data.comparison = {
      a: {
        ...article.comparison.a,
        whenItFits: flatWhenItFits(article.comparison.a.whenItFits),
      },
      b: {
        ...article.comparison.b,
        whenItFits: flatWhenItFits(article.comparison.b.whenItFits),
      },
    };
  }

  // Strip undefined keys so Astro's zod schema doesn't see explicit undefined
  for (const k of Object.keys(data)) {
    if (data[k] === undefined) delete data[k];
  }

  return { id: article.slug, data, body };
}

/** Fetch all published articles, paginating until done. */
async function fetchAllArticles(
  baseUrl: string,
  apiKey?: string,
  where: Record<string, unknown> = { status: { equals: 'published' } },
  limit = 100
): Promise<PayloadArticle[]> {
  const all: PayloadArticle[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const url = new URL('/api/articles', baseUrl);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('page', String(page));
    url.searchParams.set('depth', '2');
    // Encode where into Payload's bracket-notation query syntax
    const flatWhere = flattenWhere(where);
    for (const [k, v] of Object.entries(flatWhere)) {
      url.searchParams.set(k, v);
    }

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (apiKey) headers.Authorization = `users API-Key ${apiKey}`;

    const res = await fetch(url.toString(), { headers });
    if (!res.ok) {
      throw new Error(`Payload fetch failed: ${res.status} ${res.statusText} (${url})`);
    }
    const json = (await res.json()) as PayloadArticleAPIResponse;
    all.push(...(json.docs ?? []));
    totalPages = json.totalPages ?? 1;
    page++;
  }
  return all;
}

/** Convert {a: {b: {equals: 'x'}}} → {'where[a][b][equals]': 'x'}. */
function flattenWhere(where: Record<string, unknown>, prefix = 'where'): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(where)) {
    const path = `${prefix}[${k}]`;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flattenWhere(v as Record<string, unknown>, path));
    } else {
      out[path] = String(v);
    }
  }
  return out;
}

/** Create a Payload loader for Astro Content Layer. */
export function payloadLoader(opts: PayloadLoaderOptions = {}): Loader {
  return {
    name: 'payload-cms',
    async load(ctx: LoaderContext) {
      const apiUrl = opts.apiUrl ?? process.env.PAYLOAD_API_URL;
      const apiKey = opts.apiKey ?? process.env.PAYLOAD_API_KEY;
      const where = opts.where ?? { status: { equals: 'published' } };
      const limit = opts.limit ?? 100;

      if (!apiUrl) {
        ctx.logger.warn('[payload-cms] PAYLOAD_API_URL not set; loader yields zero entries.');
        return;
      }

      ctx.logger.info(`[payload-cms] Fetching from ${apiUrl}…`);

      let articles: PayloadArticle[] = [];
      try {
        articles = await fetchAllArticles(apiUrl, apiKey, where, limit);
      } catch (err) {
        ctx.logger.error(`[payload-cms] Fetch failed: ${err instanceof Error ? err.message : String(err)}`);
        ctx.logger.warn('[payload-cms] Continuing with zero entries. Site will build but articles section will be empty.');
        return;
      }

      ctx.store.clear();
      for (const article of articles) {
        const entry = articleToEntry(article);
        const parsed = await ctx.parseData({ id: entry.id, data: entry.data });
        ctx.store.set({
          id: entry.id,
          data: parsed,
          body: entry.body,
          digest: ctx.generateDigest({ id: entry.id, data: parsed, body: entry.body }),
        });
      }
      ctx.logger.info(`[payload-cms] Loaded ${articles.length} article(s).`);
    },
  };
}
