import type { MetadataRoute } from 'next';

import { site } from '@/content/site';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: site.url, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${site.url}/feedback`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.3 },
  ];
}
