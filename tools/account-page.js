// tools/account-page.js — content for Customer Log In and My Account (btg.js BTGAccount draws the form or the signed-in links).
module.exports = function accountPageContent(version) {
  const cdn = 'https://cdn.jsdelivr.net/gh/JeffreySylW/bob-the-tech-guy-site@' + version + '/dist/btg.';
  return '<section class="btg-hero">\n' +
    '  <p class="btg-hero-eyebrow">Customers</p>\n' +
    '  <h1 class="btg-hero-title">Your <strong>account</strong>.</h1>\n' +
    '  <p class="btg-hero-lede">Sign in to manage your profile and settings.</p>\n' +
    '  <a class="btg-hero-cta" href="tel:8448354890">844-TEKGUY-0</a>\n' +
    '</section>\n\n' +
    '<div class="btg-account"><p>Signing in needs JavaScript. Call <a href="tel:8448354890">844-TEKGUY-0</a> and Bob will help.</p></div>\n\n' +
    '<!-- btg-loader v1 -->\n<link rel="stylesheet" href="' + cdn + 'css">\n<script src="' + cdn + 'js"></script>';
};
