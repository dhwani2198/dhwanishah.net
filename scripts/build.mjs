import { mkdir, readFile, writeFile, cp, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { renderPage } from '../src/render.mjs';
import { restoreOriginalMedia } from './restore-media.mjs';

const root = resolve(import.meta.dirname, '..');
await restoreOriginalMedia(root);
const data = JSON.parse(await readFile(resolve(root,'content/published.json'), 'utf8'));
const dist = resolve(root, 'dist');
await rm(dist, {recursive:true, force:true});
await mkdir(dist, {recursive:true});
// Archive the verified masters in the repository. Ship smaller 4K copies under
// both URL names so already-open tabs keep working within Pages' site size limit.
const originals=JSON.parse(await readFile(resolve(root,'public/media/manifest.json'),'utf8'));
const masterFiles=new Set(originals.map(video=>resolve(root,'public/media',`${video.name}.mp4`)));
await cp(resolve(root,'public'), dist, {recursive:true,filter:path=>!masterFiles.has(path)});
const playback=JSON.parse(await readFile(resolve(root,'public/media/playback-manifest.json'),'utf8'));
for(const video of playback)await cp(resolve(dist,'media',video.file),resolve(dist,'media',video.source));
await cp(resolve(root,'src'), resolve(dist,'src'), {recursive:true});
await mkdir(resolve(dist,'content'));
await cp(resolve(root,'content/published.json'), resolve(dist,'content/published.json'));
const routes = ['/', '/about', ...data.projects.map(p=>`/${p.id}`)];
for (const route of routes) {
  const folder = resolve(dist, route.slice(1));
  await mkdir(folder, {recursive:true});
  await writeFile(resolve(folder, 'index.html'), renderPage(data, route));
}
await writeFile(resolve(dist,'.nojekyll'),'');
await writeFile(resolve(dist,'CNAME'),'dhwanishah.net\n');
await writeFile(resolve(dist,'robots.txt'),'User-agent: *\nAllow: /\nSitemap: https://dhwanishah.net/sitemap.xml\n');
await writeFile(resolve(dist,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.map(route=>`<url><loc>https://dhwanishah.net${route}</loc></url>`).join('')}</urlset>`);
console.log(`Built ${routes.length} static pages in dist/`);
