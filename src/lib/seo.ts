import {
  canonicalUrl,
  createStructuredData,
  getSeoRoute,
  siteMetadata,
  type SeoPath,
} from '../../seo.config';

const setMeta = (attribute: 'name' | 'property', key: string, content: string) => {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }

  element.content = content;
};

const setCanonical = (href: string) => {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');

  if (!element) {
    element = document.createElement('link');
    element.rel = 'canonical';
    document.head.appendChild(element);
  }

  element.href = href;
};

export const applySeo = (path: SeoPath) => {
  const route = getSeoRoute(path);
  const canonical = canonicalUrl(route);

  document.title = route.title;
  setMeta('name', 'description', route.description);
  setMeta('name', 'robots', 'index, follow');
  setMeta('property', 'og:title', route.title);
  setMeta('property', 'og:description', route.description);
  setMeta('property', 'og:url', canonical);
  setMeta('property', 'og:type', 'website');
  setMeta('property', 'og:site_name', siteMetadata.name);
  setMeta('property', 'og:locale', siteMetadata.locale);
  setMeta('name', 'twitter:card', 'summary');
  setMeta('name', 'twitter:title', route.title);
  setMeta('name', 'twitter:description', route.description);
  setMeta('name', 'twitter:creator', siteMetadata.twitterHandle);
  setCanonical(canonical);

  let structuredData = document.head.querySelector<HTMLScriptElement>(
    'script[data-seo-structured-data]'
  );

  if (!structuredData) {
    structuredData = document.createElement('script');
    structuredData.type = 'application/ld+json';
    structuredData.dataset.seoStructuredData = '';
    document.head.appendChild(structuredData);
  }

  structuredData.textContent = JSON.stringify(createStructuredData(route));
};
