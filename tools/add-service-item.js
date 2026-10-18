// tools/add-service-item.js — adds the Remote Support card (2026-10-17) to the live pages that list every service as
// static content: the Services index, the search page, and the Virginia and northern New Jersey pages.
// Deliberately strict: it refuses a page that already has the card or has no list, so a wrong page is never saved.
// test/remote-support.test.js proves each edit equals what the page's own generator produces.
const URL = 'https://bobthetechguy.com/remote-support/';
const SR_ITEM = '<li><a class="btg-sr-item btg-card--remote" href="' + URL + '"><span class="btg-search-ico btg-card--remote"></span><span class="btg-sr-title">Remote Support</span></a></li>';

// Virginia, NJ and search pages: <ul class="btg-sr-list"> ... </ul>; the card goes last (the list follows tools/search-pages.js order).
function addToSrList(html) {
  if (html.indexOf(URL) !== -1) throw new Error('Already lists Remote Support');
  const open = '<ul class="btg-sr-list">';
  const i = html.indexOf(open);
  if (i < 0 || html.indexOf(open, i + 1) >= 0) throw new Error('Expected exactly one btg-sr-list service list');
  const end = html.indexOf('</ul>', i);
  if (end < 0) throw new Error('The service list is not closed');
  return html.slice(0, end) + SR_ITEM + html.slice(end);
}

// Services index: the "Setup & Software" panel; the card goes last in that panel's list.
function addToIndex(html) {
  if (html.indexOf(URL) !== -1) throw new Error('Already lists Remote Support');
  const head = '<h2 class="btg-panel-title">Setup &amp; Software</h2>';
  const i = html.indexOf(head);
  if (i < 0 || html.indexOf(head, i + 1) >= 0) throw new Error('Expected exactly one Setup & Software panel');
  const end = html.indexOf('</ul>', i);
  if (end < 0) throw new Error('The panel list is not closed');
  return html.slice(0, end) + '<li><a class="btg-panel-link btg-card--remote" href="' + URL + '">Remote Support</a></li>' + html.slice(end);
}

module.exports = { addToSrList, addToIndex, URL };
