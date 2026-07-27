import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import {
  canonicalUrl,
  createStructuredData,
  seoRoutes,
  siteMetadata,
  type SeoRoute,
} from './seo.config';

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const renderSeoHead = (route: SeoRoute) => {
  const canonical = canonicalUrl(route);
  const structuredData = JSON.stringify(createStructuredData(route), null, 2).replace(
    /</g,
    '\\u003c'
  );

  return [
    `    <title>${escapeHtml(route.title)}</title>`,
    `    <meta name="description" content="${escapeHtml(route.description)}" />`,
    `    <meta name="author" content="${escapeHtml(siteMetadata.author)}" />`,
    '    <meta name="robots" content="index, follow" />',
    `    <link rel="canonical" href="${canonical}" />`,
    '    <link rel="sitemap" type="application/xml" href="/sitemap.xml" />',
    '    <meta property="og:type" content="website" />',
    `    <meta property="og:title" content="${escapeHtml(route.title)}" />`,
    `    <meta property="og:description" content="${escapeHtml(route.description)}" />`,
    `    <meta property="og:url" content="${canonical}" />`,
    `    <meta property="og:site_name" content="${escapeHtml(siteMetadata.name)}" />`,
    `    <meta property="og:locale" content="${siteMetadata.locale}" />`,
    '    <meta name="twitter:card" content="summary" />',
    `    <meta name="twitter:title" content="${escapeHtml(route.title)}" />`,
    `    <meta name="twitter:description" content="${escapeHtml(route.description)}" />`,
    `    <meta name="twitter:creator" content="${siteMetadata.twitterHandle}" />`,
    '    <script type="application/ld+json" data-seo-structured-data>',
    structuredData,
    '    </script>',
  ].join('\n');
};

const replaceSeoHead = (html: string, route: SeoRoute) =>
  html.replace(
    /<!-- seo:start -->[\s\S]*?<!-- seo:end -->/,
    `<!-- seo:start -->\n${renderSeoHead(route)}\n    <!-- seo:end -->`
  );

const routeSeoPlugin = (): Plugin => ({
  name: 'route-seo',
  enforce: 'post',
  transformIndexHtml(html) {
    return replaceSeoHead(html, seoRoutes['/']);
  },
  generateBundle(_options, bundle) {
    const indexHtml = bundle['index.html'];

    if (!indexHtml || indexHtml.type !== 'asset') {
      this.error('Could not find the generated index.html for SEO route generation.');
    }

    const source = String(indexHtml.source);

    for (const route of Object.values(seoRoutes)) {
      if (route.path === '/') continue;

      this.emitFile({
        type: 'asset',
        fileName: `${route.path.slice(1)}.html`,
        source: replaceSeoHead(source, route),
      });
    }
  },
});

export default defineConfig({
  plugins: [react(), routeSeoPlugin()],
});
