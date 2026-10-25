// Bob's helper, phase 2: a Cloudflare Worker between the widget in btg.js and the Claude API. It holds the API key as a
// secret (ANTHROPIC_API_KEY, set by Jeff with `wrangler secret put`), accepts chats only from Bob's site, caps their size,
// strips contact details before Claude sees them, and checks every reply against the never-say rules. It stores nothing.
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod/v4';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { SYSTEM } from './prompt.js';
import { SERVICE_SLUGS } from './knowledge.js';
import { redact, violates, SAFE_REPLY } from './guard.js';

export const MODEL = 'claude-haiku-5-5'; // Jeff's choice, 2026-10-24
export const LIMITS = { userTurns: 12, userChars: 500, assistantChars: 1200, bodyBytes: 20000, replyChars: 700, summaryChars: 300, services: 3 };
const DEFAULT_ORIGINS = 'https://bobthetechguy.com,https://www.bobthetechguy.com';

const Answer = z.object({
  reply: z.string(),
  services: z.array(z.enum(SERVICE_SLUGS)),
  offer_request: z.boolean(),
  summary: z.string(),
});

// A second, in-memory limit per visitor IP. The Rate Limiting binding counts per Cloudflare location and syncs lazily, and
// in the 2026-10-25 risk review 72 quick requests from one IP never got a 429. This one holds within each Worker isolate.
const hits = new Map();
export function localLimit(ip, now = Date.now(), max = 20, windowMs = 60000) {
  if (hits.size > 5000) hits.clear();
  const recent = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  if (recent.length >= max) { hits.set(ip, recent); return false; }
  recent.push(now);
  hits.set(ip, recent);
  return true;
}

const FALLBACK = { reply: "Sorry, I can't answer right now. You can still send Bob a request below, or call 844-TEKGUY-0 (Virginia) or (862) 210-5656 (New Jersey).", services: [], offer_request: true, summary: '' };

function json(body, status, origin) {
  const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
  if (origin) Object.assign(headers, { 'access-control-allow-origin': origin, vary: 'Origin' });
  return new Response(JSON.stringify(body), { status, headers });
}

// The chat as the widget sends it: [{ role: 'user' | 'assistant', content: string }], starting and ending with the visitor.
export function cleanMessages(input) {
  if (!Array.isArray(input) || !input.length) return null;
  const out = [];
  for (const m of input) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string') return null;
    const max = m.role === 'user' ? LIMITS.userChars : LIMITS.assistantChars;
    const text = m.content.trim();
    if (!text || text.length > max) return null;
    if (out.length && out[out.length - 1].role === m.role) return null;
    out.push({ role: m.role, content: m.role === 'user' ? redact(text) : text });
  }
  if (out[0].role !== 'user' || out[out.length - 1].role !== 'user') return null;
  if (out.filter((m) => m.role === 'user').length > LIMITS.userTurns) return null;
  return out;
}

// What the widget gets back: always a reply, known slugs only, nothing that breaks the never-say rules.
export function shapeAnswer(a) {
  if (!a) return FALLBACK;
  let reply = String(a.reply || '').trim().slice(0, LIMITS.replyChars);
  const summary = redact(String(a.summary || '').trim()).slice(0, LIMITS.summaryChars);
  const services = [...new Set((a.services || []).filter((s) => SERVICE_SLUGS.includes(s)))].slice(0, LIMITS.services);
  let offer = !!a.offer_request;
  if (!reply || violates(reply)) { reply = SAFE_REPLY; offer = true; }
  return { reply, services, offer_request: offer, summary: violates(summary) ? '' : summary };
}

export async function ask(client, messages) {
  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 2000, // thinking plus a few sentences of JSON; replies are capped again in shapeAnswer
    output_config: { effort: 'low', format: zodOutputFormat(Answer) },
    system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages,
  });
  if (response.stop_reason === 'refusal' || response.stop_reason === 'max_tokens') return null;
  return response.parsed_output || null;
}

export function makeClient(env) {
  return new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 1, timeout: 20000 });
}

export async function handle(request, env, deps = {}) {
  const allowed = (env.ALLOWED_ORIGINS || DEFAULT_ORIGINS).split(',').map((s) => s.trim());
  const origin = request.headers.get('origin') || '';
  const ok = allowed.includes(origin) ? origin : '';
  const url = new URL(request.url);
  if (url.pathname !== '/chat') return json({ error: 'not_found' }, 404, ok);
  if (request.method === 'OPTIONS') {
    if (!ok) return new Response(null, { status: 403 });
    return new Response(null, { status: 204, headers: { 'access-control-allow-origin': ok, 'access-control-allow-methods': 'POST', 'access-control-allow-headers': 'content-type', 'access-control-max-age': '86400', vary: 'Origin' } });
  }
  if (request.method !== 'POST') return json({ error: 'method' }, 405, ok);
  if (!ok) return json({ error: 'origin' }, 403, '');
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  if (!localLimit(ip)) return json({ error: 'rate_limited' }, 429, ok);
  if (env.RATE_LIMITER) {
    const { success } = await env.RATE_LIMITER.limit({ key: ip });
    if (!success) return json({ error: 'rate_limited' }, 429, ok);
  }
  const raw = await request.text();
  if (raw.length > LIMITS.bodyBytes) return json({ error: 'too_large' }, 413, ok);
  let body;
  try { body = JSON.parse(raw); } catch { return json({ error: 'bad_json' }, 400, ok); }
  const messages = cleanMessages(body && body.messages);
  if (!messages) return json({ error: 'bad_messages' }, 400, ok);
  if (!env.ANTHROPIC_API_KEY && !deps.client) return json(FALLBACK, 503, ok);
  try {
    const answer = await ask(deps.client || makeClient(env), messages);
    return json(shapeAnswer(answer), 200, ok);
  } catch (err) {
    // Typed SDK errors: a bad key or a bad request is ours to fix; rate limits and outages pass. Either way the visitor
    // gets the fallback line (request form + phones), never an error page.
    const status = err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.BadRequestError ? 500 : 503;
    console.error('helper:', err instanceof Anthropic.APIError ? 'claude ' + (err.status || 'connection') : 'error', err && err.message);
    return json(FALLBACK, status, ok);
  }
}
