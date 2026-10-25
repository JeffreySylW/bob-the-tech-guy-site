# Bob's helper Worker (phase 2)

A Cloudflare Worker between the "Ask Bob's helper" widget (`dist/btg.js`, `window.BTGHelper`) and the Claude API. It holds the API key as a secret, answers only chats from bobthetechguy.com, removes phone numbers, emails and card numbers before Claude sees a message, and replaces any reply that breaks Bob's never-say rules. It stores nothing. Model: `claude-haiku-5-5`.

- `src/index.js`: entry point (default export only).
- `src/chat.js`: request checks, the Claude call (structured JSON reply, cached system prompt), error fallback.
- `src/prompt.js`: Bob's rules (the never-say list) in front of the site knowledge.
- `src/knowledge.js`: generated from `docs/llms.txt` and `dist/btg.js` by `node tools/build-helper-knowledge.js` (repo root). Re-run that after editing either file, then redeploy.
- `src/guard.js`: contact-detail removal and the reply check.

## Test locally (no key, no cost)

```bash
cd worker
npm install
npm test
```

The widget side is tested from the repo root with `node test/e2e/helper-ai.e2e.mjs` (Worker mocked in `test/e2e/serve.mjs`).

## Deploy (Jeff does these steps; Claude never handles the keys)

1. **Anthropic:** in console.anthropic.com create an API key for this helper only, and set a monthly spend limit (Settings > Limits).
2. **Cloudflare:** create the (free) account, then from this folder:

```bash
npx wrangler login
```

```bash
npx wrangler secret put ANTHROPIC_API_KEY
```

(paste the key when asked; it is stored encrypted in Cloudflare, never in git)

```bash
npx wrangler deploy
```

3. Wrangler prints the Worker address, like `https://bob-helper.<your-subdomain>.workers.dev`. Its chat address is that plus `/chat`.
4. Check that it answers (should print a JSON reply):

```bash
curl -s -X POST https://bob-helper.YOUR-SUBDOMAIN.workers.dev/chat -H "origin: https://bobthetechguy.com" -H "content-type: application/json" -d "{\"messages\":[{\"role\":\"user\",\"content\":\"my wifi keeps dropping\"}]}"
```

5. Tell Claude the address. Claude puts it in `HELPER_API` in `dist/btg.js`, re-runs the tests, and releases a new bundle tag after the risk-reviewer, with your OK.

## Limits and costs

- Per chat: 12 visitor messages of up to 500 characters; replies capped at 700 characters.
- Per visitor IP: 20 requests a minute (Workers Rate Limiting binding in `wrangler.toml`).
- Cloudflare free plan: 100,000 requests a day. Claude Haiku 5.5: about $2 a month at 300 chats (estimate), capped by the console spend limit.
- To switch the AI off: empty `HELPER_API` in the bundle (the guided chips and request form keep working), or `npx wrangler delete`.
- Allowed sites: `ALLOWED_ORIGINS` in `wrangler.toml`. An origin check stops other websites from using the Worker, not a determined script; the rate limit and the spend limit are the backstop.
