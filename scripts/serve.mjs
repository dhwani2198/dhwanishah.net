import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { renderPage } from '../src/render.mjs';
import { restoreOriginalMedia } from './restore-media.mjs';

const root = resolve(import.meta.dirname, '..');
await restoreOriginalMedia(root);
const data = JSON.parse(await readFile(resolve(root,'content/published.json'), 'utf8'));
const port = Number(process.env.PORT || process.argv.find(arg=>arg.startsWith('--port='))?.split('=')[1] || 4187);
const types = {'.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript', '.mjs':'text/javascript', '.json':'application/json', '.svg':'image/svg+xml', '.webp':'image/webp', '.mp4':'video/mp4', '.woff2':'font/woff2', '.jpg':'image/jpeg', '.png':'image/png'};
const pages = new Set(['/', '/index.html', '/about', ...data.projects.map(p=>`/${p.id}`)]);
createServer(async (req,res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const route = pathname==='/'?'/':pathname.replace(/\/$/, '');
    if (pages.has(route)) {
      const html = renderPage(data, route==='/index.html'?'/':route);
      res.writeHead(200, {'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
      res.end(req.method==='HEAD'?undefined:html); return;
    }
    const base = pathname.startsWith('/src/') || pathname.startsWith('/content/') ? root : resolve(root,'public');
    const path = resolve(base, '.'+pathname);
    if (!path.startsWith(base+'/')) {res.writeHead(403);res.end();return;}
    const info = await stat(path);
    if (!info.isFile()) {res.writeHead(404);res.end();return;}
    const headers = {'content-type':types[extname(path)]||'application/octet-stream', 'accept-ranges':'bytes', 'cache-control':'no-cache'};
    const match = req.headers.range?.match(/^bytes=(\d*)-(\d*)$/);
    let start=0, end=info.size-1;
    if (match) {
      if (!match[1]) start=Math.max(0,info.size-Number(match[2]));
      else {start=Number(match[1]);end=match[2]?Math.min(Number(match[2]),end):end;}
      if (start>end || start>=info.size) {res.writeHead(416,{'content-range':`bytes */${info.size}`});res.end();return;}
      headers['content-range']=`bytes ${start}-${end}/${info.size}`;
    }
    headers['content-length']=end-start+1;
    res.writeHead(match?206:200,headers);
    if (req.method==='HEAD') {res.end();return;}
    createReadStream(path,{start,end}).pipe(res);
  } catch {res.writeHead(404);res.end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`Dhwani’s portfolio: http://localhost:${port}`));
