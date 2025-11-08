import { SitemapStream, streamToPromise } from 'sitemap';
import { Readable } from 'stream';

const BASE_URL = 'https://davidnet.net';
const CACHE_DURATION = 48 * 60 * 60 * 1000; // 48 hours

let cachedSitemap: string | null = null;
let cachedAt = 0;

const routes = [
  { path: '/', changefreq: 'daily', priority: 1.0 },
  { path: '/help', changefreq: 'weekly', priority: 0.8 },
  { path: '/help/contact', changefreq: 'monthly', priority: 0.7 },
  { path: '/help/delete_account', changefreq: 'monthly', priority: 0.7 },
  { path: '/legal', changefreq: 'monthly', priority: 0.6 },
  { path: '/legal/acceptable_use_policy', changefreq: 'yearly', priority: 0.5 },
  { path: '/legal/cookies', changefreq: 'yearly', priority: 0.5 },
  { path: '/legal/disclaimer', changefreq: 'yearly', priority: 0.5 },
  { path: '/legal/downloaders', changefreq: 'yearly', priority: 0.5 },
  { path: '/legal/licenses', changefreq: 'yearly', priority: 0.5 },
  { path: '/legal/privacy_policy', changefreq: 'yearly', priority: 0.5 },
  { path: '/legal/security_policy', changefreq: 'yearly', priority: 0.5 },
  { path: '/legal/terms_of_service', changefreq: 'yearly', priority: 0.5 }
];

async function fetchLastMod(path: string): Promise<string> {
  const githubPath = path === '/' ? 'src/routes/+page.svelte' : `src/routes${path}/+page.svelte`;
  const url = `https://api.github.com/repos/davidnet-net/apex/commits?path=${githubPath}&per_page=1`;
  
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'sitemap-generator' }
    });
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return new Date(data[0].commit.committer.date).toISOString();
    }
  } catch (err) {
    console.error('GitHub fetch error:', err);
  }
  return new Date().toISOString();
}

export async function GET() {
  const now = Date.now();
  if (cachedSitemap && now - cachedAt < CACHE_DURATION) {
    return new Response(cachedSitemap, { headers: { 'Content-Type': 'application/xml' } });
  }

  const urls = await Promise.all(
    routes.map(async (r) => {
      const lastmod = await fetchLastMod(r.path);
      return { ...r, lastmod };
    })
  );

  const stream = new SitemapStream({ hostname: BASE_URL });
  const xml = await streamToPromise(Readable.from(urls).pipe(stream));

  cachedSitemap = xml.toString();
  cachedAt = now;

  return new Response(cachedSitemap, { headers: { 'Content-Type': 'application/xml' } });
}
