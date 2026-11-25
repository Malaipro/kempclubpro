import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { HelmetProvider } from 'react-helmet-async';
import type { HelmetServerState } from 'react-helmet-async';
import type { Plugin } from 'vite';
import { Hero } from '../components/Hero';
import { KempOverview } from '../components/KempOverview';
import { HomeHead } from './HomeHead';

export function prerenderHome(): Plugin {
  return {
    name: 'kemp-prerender-home',
    transformIndexHtml(html) {
      const context: { helmet?: HelmetServerState } = {};
      const content = renderToStaticMarkup(
        <HelmetProvider context={context}>
          <HomeHead />
          <main id="kemp-home-snapshot">
            <Hero staticSnapshot />
            <KempOverview />
          </main>
        </HelmetProvider>,
      );
      const { helmet } = context;
      if (!helmet || !html.includes('<!-- kemp-home-head -->') || !html.includes('<!-- kemp-home-body -->')) {
        throw new Error('Homepage prerender could not populate index.html');
      }
      const head = [helmet.title, helmet.meta, helmet.link, helmet.script].map((tags) => tags.toString()).join('\n    ');
      return html
        .replace('<!-- kemp-home-head -->', () => head)
        .replace('<!-- kemp-home-body -->', () => content);
    },
  };
}
