import React from 'react';
import { Helmet } from 'react-helmet-async';
import { clubDescription, clubName, coverPath, homeDescription, homeTitle, homeUrl, intensiveDescription, logoPath } from './homeContent';

const organizationId = `${homeUrl}#organization`;
const websiteId = `${homeUrl}#website`;
const webpageId = `${homeUrl}#webpage`;
const serviceId = `${homeUrl}#intensive`;
const coverUrl = new URL(coverPath, homeUrl).href;
const coverAlt = 'КЭМП — мужской клуб непрерывного развития';

const graph = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': organizationId,
      name: clubName,
      alternateName: 'КЭМП',
      url: homeUrl,
      logo: new URL(logoPath, homeUrl).href,
      description: clubDescription,
    },
    {
      '@type': 'WebSite',
      '@id': websiteId,
      url: homeUrl,
      name: 'КЭМП',
      alternateName: clubName,
      inLanguage: 'ru-RU',
      publisher: { '@id': organizationId },
    },
    {
      '@type': 'WebPage',
      '@id': webpageId,
      url: homeUrl,
      name: homeTitle,
      description: homeDescription,
      inLanguage: 'ru-RU',
      isPartOf: { '@id': websiteId },
      about: { '@id': organizationId },
      mainEntity: { '@id': serviceId },
    },
    {
      '@type': 'Service',
      '@id': serviceId,
      name: '60-дневный интенсив КЭМП',
      url: serviceId,
      description: intensiveDescription,
      areaServed: 'Казань',
      provider: { '@id': organizationId },
    },
  ],
};

export function HomeHead() {
  return (
    <Helmet defer={false}>
      <title>{homeTitle}</title>
      <meta name="description" content={homeDescription} />
      <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />
      <link rel="canonical" href={homeUrl} />
      <meta property="og:locale" content="ru_RU" />
      <meta property="og:site_name" content="КЭМП" />
      <meta property="og:title" content={homeTitle} />
      <meta property="og:description" content={homeDescription} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={homeUrl} />
      <meta property="og:image" content={coverUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="678" />
      <meta property="og:image:alt" content={coverAlt} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={homeTitle} />
      <meta name="twitter:description" content={homeDescription} />
      <meta name="twitter:image" content={coverUrl} />
      <meta name="twitter:image:alt" content={coverAlt} />
      <script type="application/ld+json">{JSON.stringify(graph).replace(/</g, '\\u003c')}</script>
    </Helmet>
  );
}
