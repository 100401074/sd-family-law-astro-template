/**
 * Internal link resolver.
 *
 * The content engine emits `{{internal_link_placeholder: <topic name>}}`
 * tokens inside article markdown when a logical link target is implied but
 * the engine doesn't yet have a slug for it. This module resolves each token
 * to either:
 *   1. A real <a href="/slug"> when a published article matches by title or slug
 *   2. A plain text span when no match exists (so the article still reads
 *      cleanly), plus a build-time warning logged to the console
 *
 * Matching is fuzzy: lowercase, alphanumeric-only comparison. The lookup
 * runs once at build time over the full article collection.
 */

interface ArticleIndex {
  slug: string;
  title: string;
  normalizedTitle: string;
  normalizedSlug: string;
}

const TOKEN_RE = /\{\{\s*internal_link_placeholder:\s*([^}]+?)\s*\}\}/g;

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function buildIndex(articles: { slug: string; data: { title: string } }[]): ArticleIndex[] {
  return articles.map((a) => ({
    slug: a.slug,
    title: a.data.title,
    normalizedTitle: normalize(a.data.title),
    normalizedSlug: normalize(a.slug),
  }));
}

function findBestMatch(query: string, index: ArticleIndex[]): ArticleIndex | null {
  const q = normalize(query);
  if (!q) return null;

  // 1. Exact normalized match on slug or title
  const exact = index.find((a) => a.normalizedSlug === q || a.normalizedTitle === q);
  if (exact) return exact;

  // 2. The query is fully contained in the title or slug
  const contains = index.find((a) =>
    a.normalizedTitle.includes(q) || a.normalizedSlug.includes(q));
  if (contains) return contains;

  // 3. Token overlap — split query into tokens, count overlap with article tokens
  const qTokens = q.split(' ').filter((t) => t.length > 2);
  if (qTokens.length === 0) return null;

  let best: { match: ArticleIndex; score: number } | null = null;
  for (const a of index) {
    const aTokens = new Set(a.normalizedTitle.split(' ').concat(a.normalizedSlug.split(' ')));
    const overlap = qTokens.filter((t) => aTokens.has(t)).length;
    if (overlap >= Math.ceil(qTokens.length * 0.6)) {
      if (!best || overlap > best.score) {
        best = { match: a, score: overlap };
      }
    }
  }
  return best?.match ?? null;
}

export interface ResolveResult {
  html: string;
  unresolved: string[];
  resolvedCount: number;
}

/** Replace every {{internal_link_placeholder:...}} token in `html` with either
 *  a real <a> or a plain text fallback. */
export function resolveInternalLinks(
  html: string,
  articles: { slug: string; data: { title: string } }[]
): ResolveResult {
  const index = buildIndex(articles);
  const unresolved: string[] = [];
  let resolvedCount = 0;

  const out = html.replace(TOKEN_RE, (_full, rawTopic: string) => {
    const topic = rawTopic.trim();
    const match = findBestMatch(topic, index);
    if (match) {
      resolvedCount++;
      const linkText = topic.replace(/^a |^the /i, '');
      return `<a href="/articles/${match.slug}" class="internal-link" data-topic="${topic}">${linkText}</a>`;
    } else {
      unresolved.push(topic);
      return `<span class="internal-link internal-link--unresolved" data-topic="${topic}">${topic}</span>`;
    }
  });

  return { html: out, unresolved, resolvedCount };
}

/** Compute a link manifest for review. Useful in a dev /admin page. */
export function buildLinkManifest(
  articles: { slug: string; body?: string; data: { title: string } }[]
): { resolved: { from: string; topic: string; targetSlug: string }[]; unresolved: { from: string; topic: string }[] } {
  const index = buildIndex(articles);
  const resolved: { from: string; topic: string; targetSlug: string }[] = [];
  const unresolved: { from: string; topic: string }[] = [];

  for (const a of articles) {
    if (!a.body) continue;
    let m: RegExpExecArray | null;
    const re = new RegExp(TOKEN_RE.source, 'g');
    while ((m = re.exec(a.body)) !== null) {
      const topic = m[1]?.trim();
      if (!topic) continue;
      const match = findBestMatch(topic, index);
      if (match) {
        resolved.push({ from: a.slug, topic, targetSlug: match.slug });
      } else {
        unresolved.push({ from: a.slug, topic });
      }
    }
  }

  return { resolved, unresolved };
}
