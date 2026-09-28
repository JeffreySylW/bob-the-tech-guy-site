// tools/search-page.js — content of the /search/ page (the header search box submits here).
// The results are drawn by btg.js (BTGSearch.initPage); the div's text is the no-JavaScript fallback.
module.exports = function searchPageContent(version) {
  const cdn = 'https://cdn.jsdelivr.net/gh/JeffreySylW/bob-the-tech-guy-site@' + version + '/dist/btg.';
  return '<section class="btg-hero">\n' +
    '  <p class="btg-hero-eyebrow">Search</p>\n' +
    '  <h1 class="btg-hero-title">Find the <strong>right service</strong>.</h1>\n' +
    '  <p class="btg-hero-lede">Type what is wrong or what you need, like “slow computer” or “wifi”.</p>\n' +
    '  <a class="btg-hero-cta" href="tel:8448354890">844-TEKGUY-0</a>\n' +
    '</section>\n\n' +
    '<div class="btg-search-page"><p>Search needs JavaScript. Call <a href="tel:8448354890">844-TEKGUY-0</a> and Bob will help.</p></div>\n\n' +
    '<!-- btg-loader v1 -->\n<link rel="stylesheet" href="' + cdn + 'css">\n<script src="' + cdn + 'js"></script>';
};
