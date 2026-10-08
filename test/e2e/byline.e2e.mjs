// Browser test for v1.8.2: the post byline and author box are hidden. Run: node test/e2e/byline.e2e.mjs
import serve from './serve.mjs';
import { launch } from './cdp.mjs';
const server = await serve(4451);
const b = await launch({ width: 1200, height: 900 });
await b.goto('http://localhost:4451/best-computer-repair-chesterfield-va/');
await b.sleep(1500);
const ok = await b.evalJs(`!!document.querySelector('.fusion-meta-info') && !!document.querySelector('.about-author') && getComputedStyle(document.querySelector('.fusion-meta-info')).display === 'none' && getComputedStyle(document.querySelector('.about-author')).display === 'none' && !/Jeffrey Weaver|Comments Off|About the Author/.test(document.querySelector('#main').innerText)`);
console.log((ok ? 'ok   ' : 'FAIL ') + 'byline and author box are hidden on the Chesterfield page');
await b.close(); server.close(); process.exit(ok ? 0 : 1);
