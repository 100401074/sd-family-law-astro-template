/**
 * Lexical (Payload's rich-text format) → markdown converter.
 *
 * Payload v3 stores rich text as a JSON tree of Lexical nodes. The Astro
 * pipeline needs markdown source so it can render with its standard markdown
 * processor (and so search engines see clean text). This module walks the
 * Lexical tree and emits markdown.
 *
 * Covers the node types Payload's default Lexical editor produces:
 *   - root, paragraph, heading (h1–h6)
 *   - text (with bold / italic / code / underline / strikethrough format bits)
 *   - list (ordered / unordered), listitem
 *   - quote, link, code (block), horizontalrule
 *   - linebreak, tab
 *
 * Anything unknown is rendered as plain text from descendants. The converter
 * is intentionally small and dependency-free.
 */

// ─── Lexical node types ──────────────────────────────────────────────────────

interface BaseNode {
  type: string;
  children?: LexicalNode[];
  version?: number;
  [key: string]: unknown;
}

interface TextNode extends BaseNode {
  type: 'text';
  text: string;
  format?: number;  // bitmask: 1 bold, 2 italic, 4 strike, 8 underline, 16 code, 32 subscript, 64 superscript
}

interface HeadingNode extends BaseNode {
  type: 'heading';
  tag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  children?: LexicalNode[];
}

interface ParagraphNode extends BaseNode {
  type: 'paragraph';
  children?: LexicalNode[];
}

interface ListNode extends BaseNode {
  type: 'list';
  listType?: 'bullet' | 'number' | 'check';
  start?: number;
  tag?: 'ul' | 'ol';
  children?: LexicalNode[];
}

interface ListItemNode extends BaseNode {
  type: 'listitem';
  value?: number;
  children?: LexicalNode[];
}

interface LinkNode extends BaseNode {
  type: 'link';
  fields?: {
    url?: string;
    newTab?: boolean;
    linkType?: 'custom' | 'internal';
  };
  url?: string;
  children?: LexicalNode[];
}

interface CodeBlockNode extends BaseNode {
  type: 'code';
  language?: string;
  children?: LexicalNode[];
}

interface QuoteNode extends BaseNode {
  type: 'quote';
  children?: LexicalNode[];
}

interface LineBreakNode extends BaseNode {
  type: 'linebreak';
}

interface HorizontalRuleNode extends BaseNode {
  type: 'horizontalrule' | 'horizontal-rule';
}

interface RootNode extends BaseNode {
  type: 'root';
  children?: LexicalNode[];
}

type LexicalNode =
  | RootNode
  | ParagraphNode
  | HeadingNode
  | TextNode
  | ListNode
  | ListItemNode
  | LinkNode
  | QuoteNode
  | CodeBlockNode
  | LineBreakNode
  | HorizontalRuleNode
  | BaseNode;

export interface LexicalRichText {
  root: RootNode;
}

// ─── Format bitmask helpers ──────────────────────────────────────────────────

const FORMAT_BOLD = 1;
const FORMAT_ITALIC = 2;
const FORMAT_STRIKETHROUGH = 4;
const FORMAT_UNDERLINE = 8;
const FORMAT_CODE = 16;

function applyTextFormat(text: string, format = 0): string {
  if (!text) return '';
  let out = text;
  if (format & FORMAT_CODE) out = '`' + out + '`';
  if (format & FORMAT_STRIKETHROUGH) out = '~~' + out + '~~';
  if (format & FORMAT_BOLD) out = '**' + out + '**';
  if (format & FORMAT_ITALIC) out = '*' + out + '*';
  if (format & FORMAT_UNDERLINE) out = '<u>' + out + '</u>';
  return out;
}

// ─── Recursive converter ─────────────────────────────────────────────────────

function nodesToMarkdown(nodes: LexicalNode[] | undefined, opts: { listDepth?: number } = {}): string {
  if (!nodes || !Array.isArray(nodes)) return '';

  const out: string[] = [];

  for (const node of nodes) {
    out.push(nodeToMarkdown(node, opts));
  }

  return out.join('');
}

function nodeToMarkdown(node: LexicalNode, opts: { listDepth?: number } = {}): string {
  if (!node) return '';
  const type = node.type;

  switch (type) {
    case 'root':
      return nodesToMarkdown((node as RootNode).children, opts);

    case 'text': {
      const t = node as TextNode;
      return applyTextFormat(t.text ?? '', t.format);
    }

    case 'linebreak':
      return '  \n';

    case 'paragraph': {
      const inner = nodesToMarkdown((node as ParagraphNode).children, opts);
      return inner.trim() ? inner + '\n\n' : '\n';
    }

    case 'heading': {
      const h = node as HeadingNode;
      const level = parseInt((h.tag || 'h2').slice(1), 10) || 2;
      const inner = nodesToMarkdown(h.children, opts);
      return '#'.repeat(level) + ' ' + inner.trim() + '\n\n';
    }

    case 'list': {
      const l = node as ListNode;
      const ordered = l.listType === 'number' || l.tag === 'ol';
      const startAt = l.start ?? 1;
      const items: string[] = [];
      let i = 0;
      for (const child of l.children ?? []) {
        if (child.type !== 'listitem') continue;
        const itemContent = nodesToMarkdown((child as ListItemNode).children, { ...opts, listDepth: (opts.listDepth ?? 0) + 1 }).trim();
        const marker = ordered ? `${startAt + i}.` : '-';
        const indent = '  '.repeat(opts.listDepth ?? 0);
        items.push(`${indent}${marker} ${itemContent}`);
        i++;
      }
      return items.join('\n') + '\n\n';
    }

    case 'listitem':
      // listitem outside a list — treat as a single bullet
      return '- ' + nodesToMarkdown((node as ListItemNode).children, opts).trim() + '\n';

    case 'link': {
      const l = node as LinkNode;
      const url = l.fields?.url ?? l.url ?? '#';
      const inner = nodesToMarkdown(l.children, opts).trim();
      return `[${inner}](${url})`;
    }

    case 'quote': {
      const inner = nodesToMarkdown((node as QuoteNode).children, opts).trim();
      const quoted = inner.split('\n').map((line) => '> ' + line).join('\n');
      return quoted + '\n\n';
    }

    case 'code': {
      const c = node as CodeBlockNode;
      const inner = nodesToMarkdown(c.children, opts);
      // Strip line-break-converted "  \n" markers for code blocks
      const clean = inner.replace(/ {2}\n/g, '\n').replace(/\n+$/, '');
      const lang = c.language ? c.language : '';
      return '```' + lang + '\n' + clean + '\n```\n\n';
    }

    case 'horizontalrule':
    case 'horizontal-rule':
      return '\n---\n\n';

    case 'tab':
      return '\t';

    default: {
      // Unknown node — recurse children if any, otherwise drop
      const children = (node as BaseNode).children;
      if (Array.isArray(children)) {
        return nodesToMarkdown(children, opts);
      }
      return '';
    }
  }
}

// ─── Public entry ────────────────────────────────────────────────────────────

/** Convert a Lexical rich-text value (from Payload's richText field) to markdown. */
export function lexicalToMarkdown(value: LexicalRichText | null | undefined): string {
  if (!value || !value.root) return '';
  const md = nodesToMarkdown(value.root.children);
  // Collapse 3+ blank lines into max 2
  return md.replace(/\n{3,}/g, '\n\n').trim() + '\n';
}
