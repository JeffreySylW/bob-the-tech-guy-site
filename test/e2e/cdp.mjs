// Minimal headless-Edge driver over the DevTools protocol.
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function launch({ width = 1440, height = 900, mobile = false } = {}) {
  const port = 9600 + Math.floor(Math.random() * 300);
  spawn(EDGE, ['--headless=new', '--remote-allow-origins=*', '--disable-gpu', '--hide-scrollbars', '--ignore-certificate-errors',
    `--remote-debugging-port=${port}`, `--user-data-dir=${process.env.TEMP}/e2e-profile-${port}`, `--window-size=${width},${height}`, 'about:blank'], { stdio: 'ignore' });
  let tabs;
  for (let i = 0; i < 120 && !tabs; i++) { await sleep(250); try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); } catch {} }
  const ws = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  let id = 0; const pending = new Map();
  const handlers = {};
  ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.method) (handlers[m.method] || []).forEach((f) => f(m.params)); else { pending.get(m.id)?.(m); pending.delete(m.id); } });
  const on = (method, f) => { (handlers[method] = handlers[method] || []).push(f); };
  // Every call answers within 15s, so a stalled page fails a check instead of hanging the run.
  const send = (method, params = {}) => new Promise((r) => { const n = ++id; pending.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); setTimeout(() => { if (pending.has(n)) { pending.delete(n); console.log('  (cdp timeout: ' + method + ')'); r({ error: 'timeout' }); } }, 15000); });
  if (mobile) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 2, mobile: true });
    await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  }
  // Behave like a focused window so focus/blur events fire in the headless tab.
  await send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await send('Page.enable');
  const evalJs = async (x) => { const r = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); return r.result && r.result.result ? r.result.result.value : undefined; };
  const key = async (k, code, vk, text) => { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: vk, text }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk }); };
  const type = async (s) => { for (const ch of s) await key(ch, 'Key' + ch.toUpperCase(), ch.toUpperCase().charCodeAt(0), ch); };
  const click = async (x, y) => { for (const t of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type: t, x, y, button: 'left', clickCount: 1 }); };
  const move = (x, y) => send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  // Wait for the load event (capped at 20s), then let late scripts settle.
  const goto = async (url) => { const loaded = new Promise((r) => on('Page.loadEventFired', r)); await send('Page.navigate', { url }); await Promise.race([loaded, sleep(20000)]); await sleep(800); };
  const shot = async (file) => writeFileSync(file, Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).result.data, 'base64'));
  const close = () => new Promise((ok) => { ws.close(); spawn('powershell', ['-Command', `Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | ? { $_.CommandLine -match 'e2e-profile-${port}' } | % { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`], { stdio: 'ignore' }).on('exit', ok); });
  // Answer matching requests locally (keeps tests off slow live pages).
  const stub = async (pattern, body) => { await send('Fetch.enable', { patterns: [{ urlPattern: pattern }] }); on('Fetch.requestPaused', (p) => send('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 200, responseHeaders: [{ name: 'content-type', value: 'text/html' }], body: Buffer.from(body).toString('base64') })); };
  return { on, stub, send, evalJs, key, type, click, move, goto, shot, sleep, close };
}
