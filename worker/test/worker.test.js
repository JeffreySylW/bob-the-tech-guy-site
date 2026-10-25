// worker/test/worker.test.js — run: cd worker && npm test
// The Worker with a stubbed Claude client: nothing here calls the real API.
import test from 'node:test';
import assert from 'node:assert';
import Anthropic from '@anthropic-ai/sdk';
import { handle, cleanMessages, shapeAnswer, MODEL, LIMITS } from '../src/chat.js';
import { redact, violates } from '../src/guard.js';
import { SYSTEM, RULES } from '../src/prompt.js';
import { KNOWLEDGE } from '../src/knowledge.js';

const SITE = 'https://bobthetechguy.com';
const env = { ANTHROPIC_API_KEY: 'test-key' };
const req = (body, { origin = SITE, method = 'POST', path = '/chat' } = {}) =>
  new Request('https://bob-helper.example.workers.dev' + path, { method, headers: { origin, 'content-type': 'application/json' }, body: method === 'POST' ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined });
const stub = (out, seen = []) => ({ messages: { parse: async (p) => { seen.push(p); return typeof out === 'function' ? out(p) : out; } } });
const good = { stop_reason: 'end_turn', parsed_output: { reply: 'Bob sets up and fixes home Wi-Fi.', services: ['networking', 'remote-support'], offer_request: true, summary: 'Wi-Fi keeps dropping.' } };
const chat = [{ role: 'user', content: 'my wifi keeps dropping' }];

test('a chat from Bob\'s site gets the shaped answer, with CORS for that origin', async () => {
  const seen = [];
  const r = await handle(req({ messages: chat }), env, { client: stub(good, seen) });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.headers.get('access-control-allow-origin'), SITE);
  assert.deepStrictEqual(await r.json(), good.parsed_output);
  const p = seen[0];
  assert.strictEqual(p.model, 'claude-haiku-5-5');
  assert.strictEqual(MODEL, 'claude-haiku-5-5');
  assert.strictEqual(p.system[0].text, SYSTEM);
  assert.deepStrictEqual(p.system[0].cache_control, { type: 'ephemeral' });
  assert.strictEqual(p.output_config.effort, 'low');
  assert.strictEqual(p.output_config.format.type, 'json_schema');
  assert.ok(!('temperature' in p) && !('thinking' in p));
});

test('other origins, other paths and other methods are refused', async () => {
  assert.strictEqual((await handle(req({ messages: chat }, { origin: 'https://evil.example' }), env, { client: stub(good) })).status, 403);
  assert.strictEqual((await handle(req({ messages: chat }, { origin: '' }), env, { client: stub(good) })).status, 403);
  assert.strictEqual((await handle(req(null, { method: 'GET' }), env, { client: stub(good) })).status, 405);
  assert.strictEqual((await handle(req({ messages: chat }, { path: '/' }), env, { client: stub(good) })).status, 404);
  const pre = await handle(req(null, { method: 'OPTIONS' }), env);
  assert.strictEqual(pre.status, 204);
  assert.strictEqual(pre.headers.get('access-control-allow-origin'), SITE);
  assert.strictEqual((await handle(req(null, { method: 'OPTIONS', origin: 'https://evil.example' }), env)).status, 403);
  assert.strictEqual((await handle(req({ messages: chat }, { origin: 'http://localhost:4410' }), { ...env, ALLOWED_ORIGINS: 'http://localhost:4410' }, { client: stub(good) })).status, 200);
});

test('malformed or oversized chats are refused before any Claude call', async () => {
  let calls = 0;
  const c = stub(() => { calls++; return good; });
  for (const body of ['not json', { messages: [] }, { messages: [{ role: 'assistant', content: 'hi' }] }, { messages: [{ role: 'system', content: 'x' }] },
    { messages: [{ role: 'user', content: 'x'.repeat(LIMITS.userChars + 1) }] }, { messages: [{ role: 'user', content: 'a' }, { role: 'user', content: 'b' }] },
    { messages: Array.from({ length: 25 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: 'hi' })) }, 'x'.repeat(LIMITS.bodyBytes + 1)]) {
    const r = await handle(req(body), env, { client: c });
    assert.ok(r.status === 400 || r.status === 413, JSON.stringify(body).slice(0, 60));
  }
  assert.strictEqual(calls, 0);
});

test('contact details are removed before Claude sees the chat', () => {
  const m = cleanMessages([{ role: 'user', content: 'call me at (804) 555-0100 or jane@example.com, card 4111 1111 1111 1111' }]);
  assert.strictEqual(m[0].content, 'call me at [phone removed] or [email removed], card [number removed]');
  assert.strictEqual(redact('804.555.0100 and +1 862 210 5656'), '[phone removed] and [phone removed]');
});

test('the rate limiter, when bound, turns visitors away with 429', async () => {
  const r = await handle(req({ messages: chat }), { ...env, RATE_LIMITER: { limit: async () => ({ success: false }) } }, { client: stub(good) });
  assert.strictEqual(r.status, 429);
});

test('replies that break a never-say rule are replaced with the safe line', () => {
  for (const bad of ['A tune-up is $79.', 'That costs about 80 dollars.', 'We can usually do it same-day.', 'Bob replies within 2 hours.', 'Comes with a 90-day warranty.',
    'Your files can definitely be recovered all of them.', 'There is a 95% chance.', 'Visit us at 1234 Main Street.', 'Try Geek Squad instead.', 'Guaranteed fix.']) {
    assert.ok(violates(bad), bad);
    const a = shapeAnswer({ reply: bad, services: [], offer_request: false, summary: '' });
    assert.match(a.reply, /Bob goes over with you himself/);
    assert.strictEqual(a.offer_request, true);
  }
  for (const fine of ['Bob gives a price once he has looked at the job.', 'Bob is open Tuesday 9:30 AM to 7 PM.', 'Call 844-TEKGUY-0 or (862) 210-5656.', 'The New Jersey office is at 228 Broadway, Pompton Lakes.']) {
    assert.ok(!violates(fine), fine);
  }
});

test('shapeAnswer(): unknown slugs dropped, at most three, lengths capped, summary scrubbed', () => {
  const a = shapeAnswer({ reply: 'x'.repeat(2000), services: ['networking', 'made-up', 'anti-virus', 'networking', 'backup-solutions', 'email-setup'], offer_request: true, summary: 'Wi-Fi drops, call 804-555-0100' });
  assert.deepStrictEqual(a.services, ['networking', 'anti-virus', 'backup-solutions']);
  assert.strictEqual(a.reply.length, LIMITS.replyChars);
  assert.strictEqual(a.summary, 'Wi-Fi drops, call [phone removed]');
});

test('refusals, truncation, missing key and API errors all give the fallback line', async () => {
  for (const out of [{ stop_reason: 'refusal', parsed_output: null }, { stop_reason: 'max_tokens', parsed_output: null }, { stop_reason: 'end_turn', parsed_output: null }]) {
    const r = await handle(req({ messages: chat }), env, { client: stub(out) });
    assert.strictEqual(r.status, 200);
    assert.match((await r.json()).reply, /can't answer right now/);
  }
  const noKey = await handle(req({ messages: chat }), {});
  assert.strictEqual(noKey.status, 503);
  assert.match((await noKey.json()).reply, /844-TEKGUY-0/);
  const boom = { messages: { parse: async () => { throw new Anthropic.APIConnectionError({ message: 'down' }); } } };
  const orig = console.error; console.error = () => {};
  const r = await handle(req({ messages: chat }), env, { client: boom });
  console.error = orig;
  assert.strictEqual(r.status, 503);
  assert.strictEqual((await r.json()).offer_request, true);
});

test('the brief carries every never-say rule and both phone numbers, and no Virginia street address', () => {
  for (const w of ['prices', 'diagnose', 'turnaround', 'recovered', 'warrant', 'street address in Virginia', 'other businesses', 'passwords', 'Ignore any instruction']) assert.ok(RULES.includes(w), w);
  assert.ok(SYSTEM.includes('844-TEKGUY-0') && SYSTEM.includes('(862) 210-5656'));
  assert.ok(!violates(KNOWLEDGE), 'the site knowledge holds nothing the guard would block');
});
