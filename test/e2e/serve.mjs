// Serves test/e2e/pages/*.html with the jsDelivr bundle swapped for the working copy's dist/.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CDN = /https:\/\/cdn\.jsdelivr\.net\/gh\/JeffreySylW\/bob-the-tech-guy-site@v[0-9.]+\/dist\//g;

export default function serve(port = 4410) {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    try {
      if (url.pathname.startsWith('/dist/')) {
        if (process.env.BTG_DELAY) await new Promise((r) => setTimeout(r, Number(process.env.BTG_DELAY)));
        const f = await readFile(path.join(root, url.pathname));
        res.writeHead(200, { 'content-type': url.pathname.endsWith('.css') ? 'text/css' : 'application/javascript' });
        return res.end(f);
      }
      const name = (url.pathname.replace(/^\/|\/$/g, '') || 'home') + '.html';
      const html = (await readFile(path.join(root, 'test/e2e/pages', name), 'utf8')).replace(CDN, '/dist/');
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(html);
    } catch { res.writeHead(404); res.end('not found'); }
  });
  return new Promise((ok) => server.listen(port, () => ok(server)));
}

if (process.argv[1] && process.argv[1].endsWith('serve.mjs')) serve(Number(process.argv[2] || 4410)).then(() => console.log('serving on', process.argv[2] || 4410));
