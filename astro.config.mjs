// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';

// Adjust `site` to your production URL before deploying.
// All canonical links + sitemap entries derive from this.
export default defineConfig({
  site: 'https://sdfamilylawadvocates.com',
  integrations: [
    mdx(),
    sitemap(),
  ],
  markdown: {
    shikiConfig: {
      theme: 'github-light',
    },
  },
});
