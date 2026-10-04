// tools/google-reviews.js — daily Google sync (run by .github/workflows/google-reviews.yml).
// Asks the Places API (New) for Bob's listing and writes dist/google-reviews.json: rating, review count and the
// (at most 5) reviews Google returns. Needs GOOGLE_PLACES_KEY. On any failure it exits non-zero and leaves the last
// good file in place; the site ignores a file older than 30 days.
// Run: GOOGLE_PLACES_KEY=... node tools/google-reviews.js
const fs = require('node:fs');
const path = require('node:path');

const NAME = 'Bob The Tech Guy';
const QUERY = 'Bob The Tech Guy, Pompton Lakes, NJ';
const FIELDS = 'places.displayName,places.rating,places.userRatingCount,places.googleMapsUri,places.reviews';
const OUT = path.join(__dirname, '../dist/google-reviews.json');

const https = (u) => (typeof u === 'string' && /^https:\/\//.test(u) ? u : '');

function shape(reply, now) {
  const place = ((reply && reply.places) || []).find((p) => p.displayName && p.displayName.text.trim().toLowerCase() === NAME.toLowerCase());
  if (!place) throw new Error('No "' + NAME + '" listing in the reply');
  if (typeof place.rating !== 'number' || typeof place.userRatingCount !== 'number') throw new Error('Listing has no rating/count');
  const reviews = (place.reviews || []).map((r) => ({
    name: (r.authorAttribution && r.authorAttribution.displayName) || 'Google user',
    url: https(r.authorAttribution && r.authorAttribution.uri),
    rating: r.rating || 0,
    date: r.relativePublishTimeDescription || '',
    text: ((r.originalText && r.originalText.text) || (r.text && r.text.text) || '').trim(),
  })).filter((r) => r.text);
  return { updated: new Date(now).toISOString(), rating: place.rating, count: place.userRatingCount, url: https(place.googleMapsUri), reviews };
}

async function main() {
  const key = process.env.GOOGLE_PLACES_KEY;
  if (!key) throw new Error('GOOGLE_PLACES_KEY is not set');
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': FIELDS },
    body: JSON.stringify({ textQuery: QUERY }),
  });
  if (!res.ok) throw new Error('Places API ' + res.status + ': ' + (await res.text()).slice(0, 300));
  const data = shape(await res.json(), Date.now());
  fs.writeFileSync(OUT, JSON.stringify(data, null, 1) + '\n');
  console.log('google-reviews.json: ' + data.rating + ' from ' + data.count + ', ' + data.reviews.length + ' reviews');
}

if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
module.exports = { shape };
