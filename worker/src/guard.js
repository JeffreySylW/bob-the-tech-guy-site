// Checks on both sides of the model. Contact details are removed before Claude sees a message, and a reply that breaks
// one of Bob's never-say rules is swapped for a safe line (the prompt asks; this makes sure).

const EMAIL = /[^\s@<>()]+@[^\s@<>()]+\.[a-z]{2,}/gi;
const PHONE = /(?:\+?1[\s.-]?)?\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g;
const CARD = /\b(?:\d[ -]?){13,19}\b/g;

export function redact(text) {
  return String(text).replace(EMAIL, '[email removed]').replace(CARD, '[number removed]').replace(PHONE, '[phone removed]');
}

// Bob's own numbers are allowed in replies; everything else on this list is not.
const BLOCKED = [
  /\$\s?\d/, /\b\d+\s?(dollars|bucks|usd)\b/i, /\bfree (estimate|quote|diagnos)/i, /\bdiscount/i,
  /\bwarrant/i, /\bguarantee/i,
  /\bsame[- ]day\b/i, /\bwithin (an?|\d+|one|two|three|24|48) (minutes?|hours?|days?|business days?)\b/i, /\bturnaround\b/i,
  /\b(can|will|should) (definitely |likely |probably )?(be )?(recover|restore)(ed)? (all|your|the|most)\b/i, /\b\d{1,3}\s?%/,
  /\b\d{2,6}\s+[A-Z][a-z]+(\s[A-Z][a-z]+)?\s(Rd|Road|St|Street|Ave|Avenue|Blvd|Pkwy|Parkway|Tpke|Turnpike|Dr|Drive|Ln|Lane|Ct|Court|Way|Hwy|Highway)\b/,
  /\b(geek squad|best buy|staples|office depot|ubreakifix|asurion|micro center|apple store|genius bar)\b/i,
];

export function violates(reply) {
  return BLOCKED.some((re) => re.test(reply));
}

export const SAFE_REPLY = "That's something Bob goes over with you himself. Send him a request below, or call 844-TEKGUY-0 (Virginia) or (862) 210-5656 (New Jersey).";
