// Serves test/e2e/pages/*.html with the jsDelivr bundle swapped for the working copy's dist/.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const { headBlock } = createRequire(import.meta.url)('../../tools/loader.js');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CDN = /https:\/\/cdn\.jsdelivr\.net\/gh\/JeffreySylW\/bob-the-tech-guy-site@v[0-9.]+\/dist\//g;

export default function serve(port = 4410) {
  const cf7Posts = [];
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    try {
      // Bob's helper posts requests to CF7 form 16906. Locally they land here and never reach the live form:
      // GET /__cf7 lists what was posted; a name containing FAIL gets mail_failed back.
      if (url.pathname === '/wp-json/contact-form-7/v1/contact-forms/16906/feedback' && req.method === 'POST') {
        const chunks = []; for await (const c of req) chunks.push(c);
        const form = await new Request('http://x/', { method: 'POST', headers: { 'content-type': req.headers['content-type'] }, body: Buffer.concat(chunks) }).formData();
        const fields = Object.fromEntries(form.entries());
        cf7Posts.push(fields);
        const failed = /FAIL/.test(fields['your-name'] || '');
        res.writeHead(200, { 'content-type': 'application/json' });
        return res.end(JSON.stringify(failed ? { status: 'mail_failed', message: 'There was an error trying to send your message.' } : { status: 'mail_sent', message: 'Thank you for your message. It has been sent.', posted_data_hash: 'x' }));
      }
      if (url.pathname === '/__cf7') { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify(cf7Posts)); }
      if (url.pathname.startsWith('/dist/')) {
        if (process.env.BTG_DELAY) await new Promise((r) => setTimeout(r, Number(process.env.BTG_DELAY)));
        let f = await readFile(path.join(root, url.pathname));
        // The bundle builds some addresses itself (service photos, schema logo): point those at the working copy too, as the page HTML is.
        if (url.pathname.endsWith('.js')) f = Buffer.from(f.toString('utf8').replace(CDN, '/dist/'));
        const ext = url.pathname.split('.').pop();
        res.writeHead(200, { 'content-type': { css: 'text/css', js: 'application/javascript', jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }[ext] || 'application/octet-stream' });
        return res.end(f);
      }
      const name = (url.pathname.replace(/^\/|\/$/g, '') || 'home') + '.html';
      let html = await readFile(path.join(root, 'test/e2e/pages', name), 'utf8');
      // ?head=1 adds the site-wide <head> loader, as Avada's theme option will print it.
      if (url.searchParams.has('head')) html = html.replace('</head>', headBlock('v0.0.0') + '</head>');
      html = html.replace(CDN, '/dist/');
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(html);
    } catch { res.writeHead(404); res.end('not found'); }
  });
  return new Promise((ok) => server.listen(port, () => ok(server)));
}

if (process.argv[1] && process.argv[1].endsWith('serve.mjs')) serve(Number(process.argv[2] || 4410)).then(() => console.log('serving on', process.argv[2] || 4410));
