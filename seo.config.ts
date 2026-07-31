export type SeoPath = '/' | '/work' | '/work/experience';

export type SeoRoute = {
  path: SeoPath;
  title: string;
  description: string;
  pageType: 'ProfilePage' | 'CollectionPage';
};

export const siteMetadata = {
  name: 'Juan Cazala',
  url: 'https://caza.la',
  author: 'Juan Cazala',
  locale: 'en_US',
  twitterHandle: '@juancazala',
  socialImage: {
    path: '/social.png',
    width: 1200,
    height: 1200,
    type: 'image/png',
    alt: 'Portrait of Juan Cazala wearing a red, white, and black fox mask',
  },
  sameAs: ['https://github.com/cazala', 'https://x.com/juancazala'],
} as const;

export const socialImageUrl = `${siteMetadata.url}${siteMetadata.socialImage.path}`;

export const seoRoutes: Record<SeoPath, SeoRoute> = {
  '/': {
    path: '/',
    title: 'Juan Cazala',
    description: 'Hello world, my name is Juan Cazala.',
    pageType: 'ProfilePage',
  },
  '/work': {
    path: '/work',
    title: 'Open Source — Juan Cazala',
    description: 'Hello world, my name is Juan Cazala. These are my open source projects.',
    pageType: 'CollectionPage',
  },
  '/work/experience': {
    path: '/work/experience',
    title: 'Experience — Juan Cazala',
    description: 'Hello world, my name is Juan Cazala. These are the projects I worked at.',
    pageType: 'ProfilePage',
  },
};

export const canonicalUrl = (route: SeoRoute) =>
  route.path === '/' ? `${siteMetadata.url}/` : `${siteMetadata.url}${route.path}`;

export const getSeoRoute = (pathname: string): SeoRoute => {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';
  return seoRoutes[normalizedPath as SeoPath] ?? seoRoutes['/'];
};

export const createStructuredData = (route: SeoRoute) => {
  const canonical = canonicalUrl(route);
  const websiteId = `${siteMetadata.url}/#website`;
  const personId = `${siteMetadata.url}/#juan-cazala`;
  const imageId = `${siteMetadata.url}/#social-image`;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': websiteId,
        url: `${siteMetadata.url}/`,
        name: siteMetadata.name,
      },
      {
        '@type': 'Person',
        '@id': personId,
        name: siteMetadata.author,
        url: `${siteMetadata.url}/`,
        image: {
          '@id': imageId,
        },
        jobTitle: 'Software Engineer',
        nationality: {
          '@type': 'Country',
          name: 'Argentina',
        },
        sameAs: siteMetadata.sameAs,
      },
      {
        '@type': 'ImageObject',
        '@id': imageId,
        url: socialImageUrl,
        contentUrl: socialImageUrl,
        width: siteMetadata.socialImage.width,
        height: siteMetadata.socialImage.height,
        caption: siteMetadata.socialImage.alt,
      },
      {
        '@type': route.pageType,
        '@id': `${canonical}#webpage`,
        url: canonical,
        name: route.title,
        description: route.description,
        isPartOf: {
          '@id': websiteId,
        },
        about: {
          '@id': personId,
        },
        primaryImageOfPage: {
          '@id': imageId,
        },
        ...(route.path === '/'
          ? {
              mainEntity: {
                '@id': personId,
              },
            }
          : {}),
      },
    ],
  };
};
