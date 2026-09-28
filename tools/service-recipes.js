// tools/service-recipes.js — approved content for the Services pages (6 carded, 9 split).
// Hero copy, card titles and CTA fixes are the ONLY new words allowed
// (spec: 2026-09-26-services-cards-and-centering-design.md).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BTGServiceRecipes = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  return {
    11981: {
      slug: 'networking',
      hero: { eyebrow: 'Services &middot; Networking', title: 'Home and office networks, <strong>done right</strong>.', lede: 'Home and small business Wi-Fi and wired networks.' },
      topChecklist: ['Multiplatform network setup', 'Wireless networking setup', 'Home and Office Network Setup'],
      cards: [
        { title: 'Internet &amp; Broadband', icon: 'globe', anchors: ['For millions of residences'] },
        { title: 'Home Networking', icon: 'network', anchors: ['There are multiple ways in which your residence'] },
        { title: 'Wireless Networking', icon: 'wifi', anchors: ['There has been a dramatic shift'] }
      ],
      removeSubheads: ['Home Networking', 'Wireless Networking'],
      listHeading: 'Networking Services Include:',
      merge: ['secure your broadband signal from use by others'],
      ctaFix: ['Email Setup Services', 'Networking Services']
    },
    11804: {
      slug: 'anti-virus',
      hero: { eyebrow: 'Services &middot; Virus Removal', title: 'Viruses and malware, <strong>found and eliminated</strong>.', lede: 'Viruses, spyware and malware found and eliminated for good.' },
      cards: [
        { title: 'Today&#8217;s Threats', icon: 'alert', anchors: ['As computers and computer software'] },
        { title: 'Virus &amp; Malware Removal', icon: 'shield', anchors: ['fights viruses and malware'] }
      ],
      listHeading: 'Anti-Virus Services Include:'
    },
    11863: {
      slug: 'backup-solutions',
      hero: { eyebrow: 'Services &middot; Backup', title: 'On-site and <strong>cloud-based backup</strong>.', lede: 'Automated backup, so losing a device doesn&#8217;t mean losing your data.' },
      keepBefore: ['Automated On-Site and Cloud-based Backup'],
      cards: [
        { title: 'Why Back Up', icon: 'drive', anchors: ['as bad as losing your wallet'] },
        { title: 'Cloud-Based Backup', icon: 'cloud', anchors: ['Cloud-based backup uses an Internet connection'] }
      ],
      listHeading: 'Backup Solutions Services Include:',
      after: ['Also, keep your data secure']
    },
    11976: {
      slug: 'hardware-repair-upgrades',
      hero: { eyebrow: 'Services &middot; Hardware', title: 'Hardware repair <strong>and upgrades</strong>.', lede: 'Diagnostics, tune-ups and fixes that make your computer run like new.' },
      cards: [{ title: 'Hardware Repair &amp; Upgrades', icon: 'gauge', anchors: ['Big Box Stores'] }],
      ctaFix: ['Email Setup Services', 'Hardware Repair &amp; Upgrades Services']
    },
    11971: {
      slug: 'email-setup',
      hero: { eyebrow: 'Services &middot; Email', title: 'Email setup, <strong>done right</strong>.', lede: 'Email accounts and software, set up and working.' },
      cards: [{ title: 'Email Setup', icon: 'mail', anchors: ['There are multiple ways in which your residence'] }],
      listHeading: 'Email Setup Services Include:'
    },
    11857: {
      slug: 'parental-controls',
      hero: { eyebrow: 'Services &middot; Parental Controls', title: 'Parental controls <strong>for your family</strong>.', lede: 'Control the content your children can reach online.' },
      cards: [{ title: 'Parental Controls', icon: 'lock', anchors: ['concerned about the content your children'] }],
      listHeading: 'Parental Controls Services Include:'
    },
    // Split layout (spec 2026-09-27): hero lines are the ONLY new words.
    11806: { layout: 'split', slug: 'computer-set-up', icon: 'laptop', listHeading: 'Computer Set Up Services Include:',
      hero: { eyebrow: 'Services &middot; Setup', title: 'New computer, <strong>set up right</strong>.', lede: 'Updates, accounts, programs and connections, ready from day one.' } },
    11867: { layout: 'split', slug: 'computer-tune-up', icon: 'gauge', listHeading: 'Computer Tune Up Services include:',
      hero: { eyebrow: 'Services &middot; Tune Up', title: 'A tune-up that makes it <strong>run like new</strong>.', lede: 'Cleanup, updates and dust removal for a faster PC or Mac.' } },
    11869: { layout: 'split', slug: 'data-recovery-service', icon: 'drive', listHeading: 'Data Recovery Services Include:',
      hero: { eyebrow: 'Services &middot; Data Recovery', title: 'Lost files, <strong>brought back</strong>.', lede: 'Recovery from deleted, corrupted or failed drives.' } },
    11973: { layout: 'split', slug: 'hardware-install', icon: 'plug', listHeading: 'Hardware Install Services Include:',
      hero: { eyebrow: 'Services &middot; Hardware', title: 'New hardware, <strong>installed and tested</strong>.', lede: 'Graphics cards, drives, webcams and more, installed and working together.' } },
    11978: { layout: 'split', slug: 'memory-install', icon: 'chip', listHeading: 'Memory Install Services Include:',
      hero: { eyebrow: 'Services &middot; Memory', title: 'Memory upgrades that <strong>speed things up</strong>.', lede: 'More RAM so your computer boots, opens programs and multitasks faster.' } },
    11861: { layout: 'split', slug: 'operating-system-install', icon: 'window', listHeading: 'Operating System Install Services Include:',
      hero: { eyebrow: 'Services &middot; Operating System', title: 'Windows, Mac or Linux, <strong>installed cleanly</strong>.', lede: 'A fresh operating system, updated and tuned.' } },
    11859: { layout: 'split', slug: 'printer-solutions', icon: 'printer', listHeading: 'Printer Solutions Services Include:',
      hero: { eyebrow: 'Services &middot; Printers', title: 'Printers, <strong>back to printing</strong>.', lede: 'New printer setup, and fixes for the one that stopped working.' } },
    11853: { layout: 'split', slug: 'screen-replacement', icon: 'screen', listHeading: 'Screen Replacement Services Include:',
      hero: { eyebrow: 'Services &middot; Screen Repair', title: 'Broken laptop screen? <strong>Replaced.</strong>', lede: 'Screen replacement for PC and Mac laptops.' } },
    11855: { layout: 'split', slug: 'software-installation-and-configuration', icon: 'box', listHeading: 'Software Installation and Configuration Services Include:',
      hero: { eyebrow: 'Services &middot; Software', title: 'Your software, <strong>installed and set up</strong>.', lede: 'Programs for work and play, installed and configured the way you like.' } }
  };
});
