// tools/search-pages.js — the pages search can suggest (spec 2026-09-27 header/logo/search).
// Keywords are everyday search words for the page's topic; they are never displayed.
// After editing, run: node tools/build-search-data.js
const B = 'https://bobthetechguy.com/';
const S = (slug, title, icon, keywords) => ({ title, url: B + slug + '/', type: 'SERVICE', icon, keywords });
const A = (slug, title) => ({ title, url: B + slug + '/', type: 'AREA', icon: 'pin', keywords: ['repair', 'computer', 'pc', 'near'] });
const P = (slug, title, icon, keywords) => ({ title, url: B + (slug ? slug + '/' : ''), type: 'PAGE', icon, keywords });
module.exports = [
  S('networking', 'Networking', 'wifi', ['wifi', 'router', 'internet', 'wireless', 'network', 'modem']),
  S('computer-set-up', 'Computer Set Up', 'laptop', ['new', 'setup', 'install', 'accounts', 'office']),
  S('computer-tune-up', 'Computer Tune Up', 'gauge', ['slow', 'speed', 'cleanup', 'maintenance', 'sluggish', 'dust']),
  S('anti-virus', 'Anti-Virus', 'shield', ['virus', 'malware', 'spyware', 'ransomware', 'infected', 'hacked']),
  S('backup-solutions', 'Backup Solutions', 'cloud', ['backup', 'cloud', 'files', 'restore']),
  S('data-recovery-service', 'Data Recovery Service', 'drive', ['recover', 'lost', 'deleted', 'files', 'crashed', 'drive']),
  S('software-installation-and-configuration', 'Software Installation and Configuration', 'box', ['software', 'programs', 'apps', 'office', 'install']),
  S('screen-replacement', 'Screen Replacement', 'screen', ['screen', 'cracked', 'broken', 'laptop', 'display']),
  S('parental-controls', 'Parental Controls', 'lock', ['kids', 'children', 'parental', 'filter', 'safety']),
  S('printer-solutions', 'Printer Solutions', 'printer', ['printer', 'printing', 'scanner']),
  S('operating-system-install', 'Operating System Install', 'window', ['windows', 'mac', 'linux', 'os', 'reinstall', 'upgrade']),
  S('hardware-repair-upgrades', 'Hardware Repair & Upgrades', 'tool', ['repair', 'fix', 'broken', 'upgrade', 'diagnostics']),
  S('hardware-install', 'Hardware Install', 'plug', ['graphics', 'card', 'drive', 'webcam', 'install']),
  S('memory-install', 'Memory Install', 'chip', ['ram', 'memory', 'slow', 'upgrade', 'speed']),
  S('email-setup', 'Email Setup', 'mail', ['email', 'outlook', 'mail', 'gmail']),
  A('best-computer-repair-chesterfield-va', 'Chesterfield & Richmond VA Service Area'),
  P('', 'Home', 'page', ['home', 'bob']),
  P('about', 'About', 'page', ['bob', 'veteran', 'story', 'experience']),
  P('reviews', 'Reviews', 'page', ['reviews', 'rating', 'stars']),
  P('testimonials', 'Testimonials', 'page', ['customers', 'reviews']),
  P('contact-2', 'Contact', 'page', ['contact', 'email', 'phone', 'call', 'quote']),
];
