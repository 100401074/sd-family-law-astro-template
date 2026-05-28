/**
 * JSON-LD schema builders for articles.
 *
 * Each article's frontmatter `schema_types` array lists which schemas to emit
 * (e.g., ['Article', 'FAQPage', 'LegalService', 'SpeakableSpecification']).
 * This module produces the corresponding JSON-LD objects, which BaseLayout
 * injects into <head> as <script type="application/ld+json">.
 *
 * Reference: schema.org + Google's structured data guidelines.
 */
import { firmConfig } from './firmConfig';

const { firm, attorney } = firmConfig;

export interface ArticleSchemaInput {
  title: string;
  description: string;
  url: string;            /* canonical URL */
  image?: string;
  datePublished?: string;
  dateModified?: string;
  reviewedBy?: string;
  isPillar?: boolean;
}

export interface FAQItem {
  question: string;
  answer: string;         /* HTML or plain text — stripped to plain for schema */
}

/** Strip HTML for use inside JSON-LD text fields. */
function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

/** Article — used for every page that has a title + body. */
export function buildArticleSchema(input: ArticleSchemaInput): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': input.isPillar ? 'Article' : 'Article',
    headline: input.title,
    description: input.description,
    url: input.url,
    image: input.image ?? `${firm.intakeUrl}/og-default.jpg`,
    datePublished: input.datePublished,
    dateModified: input.dateModified ?? input.datePublished,
    author: {
      '@type': 'Person',
      name: attorney.name,
      jobTitle: attorney.title,
      identifier: `${attorney.barState} Bar No. ${attorney.barNumber}`,
    },
    reviewedBy: {
      '@type': 'Person',
      name: attorney.name,
      jobTitle: attorney.title,
    },
    publisher: {
      '@type': 'Organization',
      name: firm.name,
      logo: {
        '@type': 'ImageObject',
        url: firmConfig.social.logoUrl,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': input.url,
    },
  };
}

/** FAQPage — emitted when the article has FAQ items. */
export function buildFaqSchema(items: FAQItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: stripHtml(item.question),
      acceptedAnswer: {
        '@type': 'Answer',
        text: stripHtml(item.answer),
      },
    })),
  };
}

/** LegalService — firm-level service schema. */
export function buildLegalServiceSchema(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'LegalService',
    name: firm.name,
    description: firm.tagline,
    url: firmConfig.social.url,
    telephone: firm.phone,
    image: firmConfig.social.logoUrl,
    address: {
      '@type': 'PostalAddress',
      streetAddress: firm.address.street,
      addressLocality: firm.address.city,
      addressRegion: firm.address.state,
      postalCode: firm.address.postalCode,
      addressCountry: 'US',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: firm.geoLat,
      longitude: firm.geoLng,
    },
    areaServed: firm.primaryAreasServed.map((area: string) => ({
      '@type': 'City',
      name: area,
    })),
    priceRange: '$$$',
    openingHours: 'Mo-Su',
  };
}

/** LocalBusiness — slightly different from LegalService; used for landing/city pages. */
export function buildLocalBusinessSchema(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': firmConfig.social.url,
    name: firm.name,
    image: firmConfig.social.logoUrl,
    telephone: firm.phone,
    url: firmConfig.social.url,
    address: {
      '@type': 'PostalAddress',
      streetAddress: firm.address.street,
      addressLocality: firm.address.city,
      addressRegion: firm.address.state,
      postalCode: firm.address.postalCode,
      addressCountry: 'US',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: firm.geoLat,
      longitude: firm.geoLng,
    },
    priceRange: '$$$',
  };
}

/** SpeakableSpecification — for voice-assistant extraction. */
export function buildSpeakableSchema(selectors: string[] = ['.direct-answer', '.faq-answer']): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'SpeakableSpecification',
    cssSelector: selectors,
  };
}

/** HowTo — for process-guide pages. */
export function buildHowToSchema(input: {
  title: string;
  description: string;
  steps: { title: string; text: string; image?: string }[];
  totalTime?: string;     /* ISO 8601 duration, e.g., "P6M" for six months */
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: input.title,
    description: input.description,
    totalTime: input.totalTime,
    step: input.steps.map((step, idx) => ({
      '@type': 'HowToStep',
      position: idx + 1,
      name: step.title,
      text: stripHtml(step.text),
      image: step.image,
    })),
  };
}

/** Compose all requested schemas based on the article's schema_types frontmatter. */
export interface BuildSchemasInput extends ArticleSchemaInput {
  schemaTypes: string[];
  faqItems?: FAQItem[];
  speakableSelectors?: string[];
  howToSteps?: { title: string; text: string }[];
}

export function buildSchemas(input: BuildSchemasInput): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];

  if (input.schemaTypes.includes('Article')) {
    out.push(buildArticleSchema(input));
  }
  if (input.schemaTypes.includes('FAQPage') && input.faqItems && input.faqItems.length > 0) {
    out.push(buildFaqSchema(input.faqItems));
  }
  if (input.schemaTypes.includes('LegalService')) {
    out.push(buildLegalServiceSchema());
  }
  if (input.schemaTypes.includes('LocalBusiness')) {
    out.push(buildLocalBusinessSchema());
  }
  if (input.schemaTypes.includes('SpeakableSpecification')) {
    out.push(buildSpeakableSchema(input.speakableSelectors));
  }
  if (input.schemaTypes.includes('HowTo') && input.howToSteps && input.howToSteps.length > 0) {
    out.push(buildHowToSchema({
      title: input.title,
      description: input.description,
      steps: input.howToSteps,
    }));
  }

  return out;
}
