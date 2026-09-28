// Renders the "live trace" wordmark to dist/logo.png (transparent, 2x for a 282x80 slot).
// Uses headless Edge so Roboto Slab renders exactly like on the site. Run: node tools/render-logo.mjs
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { launch, sleep } from '../test/e2e/cdp.mjs';
const require = createRequire(import.meta.url);
global.window = global;
require('../dist/btg.js');
// Same wordmark as the header, with the colours the header CSS would apply.
const svg = window.BTGHeader.LOGO_SVG
  .replace('aria-hidden="true" focusable="false"', 'xmlns="http://www.w3.org/2000/svg"')
  .replace(/ width="176" height="55"/, ' width="257" height="80"')
  .replace('class="btg-logo-top"', 'class="btg-logo-top" fill="#4a5046"')
  .replace('class="btg-logo-main"', 'class="btg-logo-main" fill="#1c201b"')
  .replace('class="btg-logo-accent"', 'class="btg-logo-accent" fill="#38792f"');
const html = `<!doctype html><link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Roboto+Slab:400,700&display=block">
<style>html,body{margin:0;background:transparent}div{width:282px;height:80px}</style><div>${svg}</div>`;
const b = await launch({ width: 282, height: 80 });
await b.send('Emulation.setDeviceMetricsOverride', { width: 282, height: 80, deviceScaleFactor: 2, mobile: false });
await b.send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
await b.goto('data:text/html;base64,' + Buffer.from(html).toString('base64'));
await b.evalJs('document.fonts.ready.then(() => true)');
await sleep(500);
const shot = await b.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 282, height: 80, scale: 1 } });
writeFileSync(new URL('../dist/logo.png', import.meta.url), Buffer.from(shot.result.data, 'base64'));
await b.close();
console.log('wrote dist/logo.png');
