// Renders upload-ready brand files for the theme settings into dist/brand/:
//   logo-282x80.png (standard), logo-564x160.png (retina), share-1200x630.png (link previews), icon-512.png (site icon).
// Uses headless Edge so Roboto Slab renders as on the site. Run: node tools/render-brand-assets.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { launch, sleep } from '../test/e2e/cdp.mjs';
const require = createRequire(import.meta.url);
global.window = global;
require('../dist/btg.js');
const out = new URL('../dist/brand/', import.meta.url);
mkdirSync(out, { recursive: true });

const mark = (w, h, top, main, accent, trace) => window.BTGHeader.LOGO_SVG
  .replace('aria-hidden="true" focusable="false"', 'xmlns="http://www.w3.org/2000/svg"')
  .replace(/ width="176" height="55"/, ` width="${w}" height="${h}"`)
  .replace('class="btg-logo-top"', `fill="${top}"`)
  .replace('class="btg-logo-main"', `fill="${main}"`)
  .replace('class="btg-logo-accent"', `fill="${accent}"`)
  .replace(/#54aa47/g, trace);
const FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Roboto+Slab:400,700|PT+Sans:400,700&display=block">';
const jobs = [
  ['logo-282x80.png', 282, 80, 1, `<div style="width:282px;height:80px">${mark(257, 80, '#4a5046', '#1c201b', '#38792f', '#54aa47')}</div>`],
  // retina = dist/logo.png (tools/render-logo.mjs), copied as logo-564x160.png
  // ['logo-564x160.png', 282, 80, 2, `<div style="width:282px;height:80px">${mark(257, 80, '#4a5046', '#1c201b', '#38792f', '#54aa47')}</div>`],
  ['share-1200x630.png', 1200, 630, 1, `<div style="width:1200px;height:630px;box-sizing:border-box;padding:90px 96px;background:radial-gradient(ellipse at 30% 0,#1d231c,#0e110d 70%);display:flex;flex-direction:column;justify-content:space-between;font-family:'PT Sans',Arial,sans-serif">
      ${mark(560, 174, '#9fb59a', '#ffffff', '#6ec95f', '#6ec95f')}
      <div><div style="color:#e8efe6;font-size:40px;font-family:'Roboto Slab',Georgia,serif;line-height:1.25">Computer repair, setup and networking<br><span style="color:#8ad97c;font-weight:700">Chesterfield &amp; Greater Richmond, VA</span></div>
      <div style="color:#cfd6cc;font-size:28px;margin-top:22px;font-weight:700;letter-spacing:.02em">844-TEKGUY-0 &nbsp;·&nbsp; Veteran-owned &amp; operated</div></div></div>`],
  ['icon-512.png', 512, 512, 1, `<div style="width:512px;height:512px">${window.BTGHeader.ICON_SVG.replace('<svg ', '<svg width="512" height="512" ')}</div>`],
];
for (const [name, w, h, scale, body] of jobs) {
  const b = await launch({ width: w, height: h });
  await b.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: scale, mobile: false });
  await b.send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
  await b.goto('data:text/html;base64,' + Buffer.from(`<!doctype html><meta charset="utf-8">${FONTS}<style>html,body{margin:0;background:transparent}</style>${body}`).toString('base64'));
  await b.evalJs('document.fonts.ready.then(() => true)');
  await sleep(600);
  const r = await b.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: w, height: h, scale: 1 } });
  writeFileSync(new URL(name, out), Buffer.from(r.result.data, 'base64'));
  await b.close();
  console.log('wrote dist/brand/' + name);
}
