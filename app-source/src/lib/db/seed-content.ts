/**
 * Editable page copy and site settings.
 *
 * Everything here lands in `content_blocks` / `site_settings` and is editable
 * in the back office, so normal copy changes never require a deploy. Headlines
 * specified verbatim in the brief are seeded exactly as given.
 */

export interface BlockSeed {
  page: string;
  key: string;
  value: string;
  type?: 'text' | 'richtext' | 'json';
  label: string;
  hint?: string;
}

const b = (
  page: string,
  key: string,
  label: string,
  value: string,
  type: BlockSeed['type'] = 'text',
  hint = '',
): BlockSeed => ({ page, key, label, value, type, hint });

// ---------------------------------------------------------------------------
// Home
// ---------------------------------------------------------------------------

const HOME: BlockSeed[] = [
  b('home', 'hero.eyebrow', 'Hero eyebrow', 'Broadcast studios & live production infrastructure'),
  b('home', 'hero.headline', 'Hero headline', 'WE BUILD THE STUDIOS\nBEHIND LIVE BROADCAST.', 'text',
    'Line breaks are preserved. Each line animates in separately.'),
  b('home', 'hero.body', 'Hero supporting text',
    'From studio design and production infrastructure to streaming technology and trained production teams, Live Miracle delivers broadcast environments built for professional live operations.'),
  b('home', 'hero.cta.primary', 'Hero primary CTA', 'REQUEST A STUDIO DEMO'),
  b('home', 'hero.cta.secondary', 'Hero secondary CTA', 'EXPLORE OUR STUDIOS'),
  b('home', 'hero.signal', 'Live signal indicator lines', '["LIVE","SIGNAL","ACTIVE"]', 'json',
    'Three short words shown in the animated signal indicator.'),

  b('home', 'workflow.eyebrow', 'Workflow eyebrow', 'How delivery works'),
  b('home', 'workflow.headline', 'Workflow headline', 'FROM CONCEPT\nTO LIVE SIGNAL.'),
  b('home', 'workflow.body', 'Workflow supporting text',
    'A studio is not a room with cameras in it. It is a planned environment, an integrated technical path and a trained team, delivered as one piece of work.'),

  b('home', 'capabilities.eyebrow', 'Capabilities eyebrow', 'Capabilities'),
  b('home', 'capabilities.headline', 'Capabilities headline', 'WHAT WE DELIVER.'),
  b('home', 'capabilities.body', 'Capabilities supporting text',
    'Six connected capabilities. Most clients need several of them, which is why we deliver them as one operation rather than as separate contracts.'),

  b('home', 'studios.eyebrow', 'Studios teaser eyebrow', 'Studio environments'),
  b('home', 'studios.headline', 'Studios teaser headline', 'TEN ENVIRONMENTS.\nONE STANDARD.'),
  b('home', 'studios.body', 'Studios teaser supporting text',
    'Each environment is built to a different visual brief and lit to a different character, but every one is planned around the same production and technical discipline.'),

  b('home', 'cta.headline', 'Closing CTA headline', "LET'S BUILD SOMETHING LIVE."),
  b('home', 'cta.body', 'Closing CTA supporting text',
    'Tell us what you need to broadcast and we will tell you what it takes to build it.'),
];

// ---------------------------------------------------------------------------
// About
// ---------------------------------------------------------------------------

const ABOUT: BlockSeed[] = [
  b('about', 'hero.eyebrow', 'Hero eyebrow', 'About'),
  b('about', 'hero.headline', 'Hero headline', 'ABOUT\nLIVE MIRACLE.'),
  b('about', 'hero.body', 'Hero supporting text',
    'Live Miracle is a professional broadcast studio and live-streaming infrastructure company. We provide studio production environments, custom studio design, streaming technology, production staff, technical operations and turnkey broadcast solutions for professional clients.'),

  b('about', 'intro.headline', 'Company section headline', 'ONE OPERATION,\nNOT SIX SUPPLIERS.'),
  b('about', 'intro.body', 'Company section body',
    'Live broadcast fails at the joins. The set is built by one company, the lighting specified by another, the encoding handled by a third, and the people who have to run all of it arrive last. Live Miracle exists to remove those joins.\n\nWe plan the environment, design and build the set, install and integrate the technical infrastructure, connect the streaming path, and train the team that operates it. The same company is accountable from the first plan to the live signal.',
    'richtext', 'Blank lines separate paragraphs.'),

  b('about', 'vision.eyebrow', 'Vision eyebrow', 'Vision'),
  b('about', 'vision.headline', 'Vision headline', 'BUILDING THE INFRASTRUCTURE\nFOR BETTER LIVE EXPERIENCES.'),
  b('about', 'vision.body', 'Vision body',
    'Live Miracle combines physical studio environments, production technology and trained people into one integrated operation. The quality of a live experience is decided by how well those three things fit together — not by any one of them on its own.',
    'richtext'),

  b('about', 'technology.eyebrow', 'Technology eyebrow', 'Technology'),
  b('about', 'technology.headline', 'Technology headline', 'ONE SIGNAL PATH,\nEND TO END.'),
  b('about', 'technology.body', 'Technology body',
    'Every element below sits on the same signal path. A decision made at the camera affects the encoder; a decision made at the encoder affects what the viewer sees. We plan them together.'),

  b('about', 'promise.eyebrow', 'Promise eyebrow', 'Our promise'),
  b('about', 'promise.headline', 'Promise headline', 'FIVE THINGS\nWE HOLD TO.'),

  b('about', 'why.eyebrow', 'Why eyebrow', 'Why Live Miracle'),
  b('about', 'why.headline', 'Why headline', 'WHAT WE BRING\nTO THE BUILD.'),
  b('about', 'why.body', 'Why body',
    'Not a comparison against anyone else — simply what we are set up to do.'),

  b('about', 'approach.eyebrow', 'Approach eyebrow', 'Our approach'),
  b('about', 'approach.headline', 'Approach headline', 'PLAN FOR OPERATION,\nNOT FOR HANDOVER.'),
  b('about', 'approach.body', 'Approach body',
    'A studio that photographs well on the day it is handed over is not the goal. The goal is an environment that still performs on its five-hundredth broadcast: maintainable, understood by the people running it, and documented well enough that a new operator can be brought up to standard.\n\nThat principle decides a lot of the detail — where the racks go, how the cabling is routed, which procedures get written down, and how much training is scheduled after go-live rather than before it.',
    'richtext'),

  b('about', 'timeline.eyebrow', 'Timeline eyebrow', 'Timeline'),
  b('about', 'timeline.headline', 'Timeline headline', 'COMPANY TIMELINE.'),
  b('about', 'timeline.body', 'Timeline body',
    'Milestones are maintained by the administrator in the back office.'),
];

// ---------------------------------------------------------------------------
// Services / Studios / Gallery / Contact / Demo
// ---------------------------------------------------------------------------

const SERVICES_PAGE: BlockSeed[] = [
  b('services', 'hero.eyebrow', 'Hero eyebrow', 'Services'),
  b('services', 'hero.headline', 'Hero headline', 'SIX SERVICES.\nONE DELIVERY CHAIN.'),
  b('services', 'hero.body', 'Hero supporting text',
    'Each service stands on its own. Together they cover the full path from an empty space to a broadcast running live with a trained team behind it.'),
  b('services', 'cta.headline', 'Service closing headline', "LET'S BUILD YOUR NEXT STUDIO."),
  b('services', 'cta.body', 'Service closing body',
    'Tell us the output you need and we will scope the environment, the technology and the team around it.'),
];

const STUDIOS_PAGE: BlockSeed[] = [
  b('studios', 'hero.eyebrow', 'Hero eyebrow', 'Studio environments'),
  b('studios', 'hero.headline', 'Hero headline', 'TEN STUDIO\nENVIRONMENTS.'),
  b('studios', 'hero.body', 'Hero supporting text',
    'Ten distinct production environments, each built to a different visual brief and lit to a different character. Availability and technical detail for each environment is maintained in the back office.'),
  b('studios', 'inquiry.headline', 'Inquiry band headline', 'NEED AN ENVIRONMENT\nTHAT IS NOT LISTED?'),
  b('studios', 'inquiry.body', 'Inquiry band body',
    'Custom studio design starts from your brand and workflow rather than an existing set.'),
];

const GALLERY_PAGE: BlockSeed[] = [
  b('gallery', 'hero.eyebrow', 'Hero eyebrow', 'Gallery'),
  b('gallery', 'hero.headline', 'Hero headline', 'THE WORK,\nUP CLOSE.'),
  b('gallery', 'hero.body', 'Hero supporting text',
    'Studio environments, camera positions, lighting and production detail.'),
  b('gallery', 'empty.title', 'Empty state title', 'NO IMAGES IN THIS CATEGORY YET'),
  b('gallery', 'empty.body', 'Empty state body',
    'Images are added and categorised from the media library in the back office.'),
];

const CONTACT_PAGE: BlockSeed[] = [
  b('contact', 'hero.eyebrow', 'Hero eyebrow', 'Contact'),
  b('contact', 'hero.headline', 'Hero headline', "LET'S BUILD SOMETHING LIVE."),
  b('contact', 'hero.body', 'Hero supporting text',
    'Tell us about the production you need to run. We will come back with what it takes to build and operate it.'),
  b('contact', 'form.title', 'Form title', 'SEND AN INQUIRY'),
  b('contact', 'form.cta', 'Form submit label', 'SEND INQUIRY'),
  b('contact', 'success.title', 'Success title', 'THANK YOU.'),
  b('contact', 'success.body', 'Success body', 'YOUR INQUIRY HAS BEEN RECEIVED. WE WILL RESPOND BY EMAIL.'),
];

const DEMO_PAGE: BlockSeed[] = [
  b('demo', 'hero.eyebrow', 'Hero eyebrow', 'Studio demo'),
  b('demo', 'hero.headline', 'Hero headline', 'REQUEST A\nSTUDIO DEMO.'),
  b('demo', 'hero.body', 'Hero supporting text',
    'Tell us which environment you are interested in and how you intend to operate. The more detail you give, the more useful the response.'),
  b('demo', 'form.cta', 'Form submit label', 'SUBMIT STUDIO INQUIRY'),
  b('demo', 'success.title', 'Confirmation title', 'THANK YOU.'),
  b('demo', 'success.body', 'Confirmation body', 'YOUR STUDIO INQUIRY HAS BEEN RECEIVED.'),
  b('demo', 'success.note', 'Confirmation note',
    'A member of the team will respond to the email address you provided.'),
];

// ---------------------------------------------------------------------------
// Legal — baseline text, administrator-editable, flagged for legal review.
// ---------------------------------------------------------------------------

const LEGAL_REVIEW_NOTE =
  'This document is a baseline draft maintained in the content management system. It must be reviewed and approved by a qualified legal advisor, and completed with the operating entity’s registered details, before publication.';

const LEGAL: BlockSeed[] = [
  b('legal', 'review.note', 'Legal review notice', LEGAL_REVIEW_NOTE, 'text',
    'Shown at the top of every legal page until an administrator clears it.'),
  b('legal', 'review.visible', 'Show legal review notice', 'true', 'text', 'Set to "false" once the documents have been reviewed.'),

  b('privacy', 'hero.headline', 'Privacy headline', 'PRIVACY POLICY'),
  b('privacy', 'body', 'Privacy policy body',
    `## Who we are
Live Miracle ("we", "us") provides broadcast studio and live production infrastructure services. The registered operating entity and its contact details are [ADD LEGAL ENTITY NAME AND REGISTERED ADDRESS].

## What we collect
We collect the information you choose to submit through the inquiry and studio demo forms on this website: your name, company, email address, telephone number, country, the services or studio environment you are interested in, and the content of your message.

We also record limited, privacy-conscious analytics about how the website is used: the page visited, the referring website’s domain, an approximate country, and a device category. We do not use advertising cookies, we do not build cross-site profiles, and we do not sell data.

## How we use it
Submitted inquiry information is used only to respond to your inquiry and to manage the resulting commercial discussion. Analytics information is used only in aggregate to understand how the website performs.

## Legal basis
Where the GDPR applies, we process inquiry information on the basis of taking steps at your request prior to entering into a contract, and on the basis of our legitimate interest in responding to business inquiries. Analytics are processed on the basis of legitimate interest in operating the website. [CONFIRM LEGAL BASIS WITH LEGAL ADVISOR]

## Retention
Inquiry records are retained for [ADD RETENTION PERIOD]. Aggregated analytics records are retained for [ADD RETENTION PERIOD].

## Your rights
Subject to applicable law you may request access to, correction of, or deletion of your personal information, and may object to or restrict its processing. To make a request, contact us at the address below.

## Sharing
We do not sell personal information. We share it only with service providers who process it on our behalf under contract, and where required by law. [ADD ANY PROCESSORS USED]

## Security
Access to submitted inquiries is restricted to authorised personnel through an authenticated administration system. Passwords are stored hashed, sessions expire, and access is logged.

## Contact
Questions about this policy: miracle@gmail.com`,
    'richtext', 'Markdown-style headings (## ) and paragraphs are supported.'),

  b('terms', 'hero.headline', 'Terms headline', 'TERMS OF USE'),
  b('terms', 'body', 'Terms of use body',
    `## Acceptance
By accessing this website you agree to these terms. If you do not agree, please do not use the site.

## About this website
This website presents information about Live Miracle’s broadcast studio and production infrastructure services. It is provided for general information. Nothing on this website constitutes an offer capable of acceptance, a warranty, or a commitment to provide any particular service, specification or availability.

## Inquiries
Submitting an inquiry does not create a contract. Any engagement is governed by a separate written agreement between the parties.

## Accuracy
We take reasonable care over the content of this website. Studio availability, technical specifications and service descriptions may change without notice. Images depict studio environments and are illustrative of production settings.

## Intellectual property
All content on this website, including text, imagery, graphics, layout and the Live Miracle name and marks, is owned by or licensed to Live Miracle and may not be reproduced without written permission.

## Acceptable use
You may not attempt to gain unauthorised access to any part of this website or its systems, interfere with its operation, or use automated means to extract content at scale.

## Limitation of liability
To the maximum extent permitted by law, Live Miracle is not liable for any indirect or consequential loss arising from use of this website. [CONFIRM LIABILITY WORDING WITH LEGAL ADVISOR]

## Governing law
These terms are governed by the law of [ADD GOVERNING JURISDICTION].

## Contact
miracle@gmail.com`,
    'richtext'),

  b('cookies', 'hero.headline', 'Cookie policy headline', 'COOKIE POLICY'),
  b('cookies', 'body', 'Cookie policy body',
    `## Summary
This website is built to work without advertising or tracking cookies. We do not use third-party advertising networks, and we do not set cross-site tracking identifiers.

## Strictly necessary cookies
A session cookie is set only when an administrator signs in to the back office. It is HttpOnly, Secure and SameSite-restricted, it holds no personal information beyond an opaque session reference, and it expires when the session ends. No cookie is set for ordinary visitors browsing the public website.

## Analytics
Website analytics are collected without cookies. Instead of a persistent identifier, a visit is counted using a salted, daily-rotating hash that cannot be linked back to an individual or followed across days. The information recorded is limited to the page path, the referring domain, an approximate country and a device category.

## Third-party content
Where an official social media profile or messaging contact is configured by the administrator, following those links will take you to a third-party service that operates under its own cookie and privacy policies.

## Changes
This policy is maintained in the content management system and may be updated. [CONFIRM WITH LEGAL ADVISOR BEFORE PUBLICATION]

## Contact
miracle@gmail.com`,
    'richtext'),
];

// ---------------------------------------------------------------------------
// Global (header / footer / shared)
// ---------------------------------------------------------------------------

const GLOBAL: BlockSeed[] = [
  b('global', 'nav.cta', 'Header CTA label', 'REQUEST A DEMO'),
  b('global', 'footer.statement', 'Footer statement',
    'Broadcast studio environments, production infrastructure and trained operational teams.'),
  b('global', 'footer.legal', 'Footer legal line', '© {year} Live Miracle. All rights reserved.', 'text',
    '{year} is replaced with the current year.'),
  b('global', 'cta.band.headline', 'Shared CTA band headline', "LET'S BUILD YOUR NEXT STUDIO."),
  b('global', 'cta.band.cta', 'Shared CTA band button', 'REQUEST A DEMO'),
  b('global', 'notfound.headline', '404 headline', 'SIGNAL NOT FOUND'),
  b('global', 'notfound.body', '404 body',
    'The page you requested is not on this route. It may have been moved, or the link may be incomplete.'),
  b('global', 'error.headline', 'Error headline', 'SIGNAL INTERRUPTED'),
  b('global', 'error.body', 'Error body',
    'Something went wrong while loading this page. Please try again.'),
];

export const CONTENT_BLOCKS: BlockSeed[] = [
  ...GLOBAL, ...HOME, ...ABOUT, ...SERVICES_PAGE, ...STUDIOS_PAGE,
  ...GALLERY_PAGE, ...CONTACT_PAGE, ...DEMO_PAGE, ...LEGAL,
];

// ---------------------------------------------------------------------------
// Site settings
// ---------------------------------------------------------------------------

export interface SettingSeed {
  key: string;
  value: string;
  type: 'text' | 'json' | 'bool' | 'number';
  label: string;
  hint?: string;
  group: string;
}

export const SITE_SETTINGS: SettingSeed[] = [
  // Identity
  { key: 'site.name', value: 'Live Miracle', type: 'text', label: 'Site name', group: 'identity' },
  { key: 'site.tagline', value: 'Broadcast studios & live production infrastructure', type: 'text', label: 'Tagline', group: 'identity' },
  { key: 'site.url', value: '', type: 'text', label: 'Canonical site URL', group: 'identity',
    hint: 'e.g. https://livemiracle.com — used for canonical tags, sitemap and OG URLs.' },

  // Contact
  { key: 'contact.email', value: 'miracle@gmail.com', type: 'text', label: 'Primary contact email', group: 'contact' },
  { key: 'contact.phone', value: '', type: 'text', label: 'Primary phone', group: 'contact', hint: 'Left blank until supplied.' },

  // WhatsApp — the button only renders once both of these are set (brief §21).
  { key: 'whatsapp.enabled', value: 'false', type: 'bool', label: 'Enable WhatsApp button', group: 'contact',
    hint: 'Only enable once an official business number is configured.' },
  { key: 'whatsapp.number', value: '', type: 'text', label: 'WhatsApp business number', group: 'contact',
    hint: 'International format, digits only. Never hard-coded in the frontend — served from settings.' },
  { key: 'whatsapp.message', value: 'Hello Live Miracle — I would like to discuss a studio project.', type: 'text',
    label: 'WhatsApp prefilled message', group: 'contact' },

  // Social
  { key: 'social.instagram.url', value: '', type: 'text', label: 'Instagram profile URL', group: 'social' },
  { key: 'social.instagram.handle', value: '', type: 'text', label: 'Instagram handle', group: 'social' },
  { key: 'social.instagram.enabled', value: 'false', type: 'bool', label: 'Show Instagram section', group: 'social',
    hint: 'Uses the CMS-managed social gallery. Instagram is never scraped and no API credentials are stored in the frontend.' },
  { key: 'social.linkedin.url', value: '', type: 'text', label: 'LinkedIn URL', group: 'social' },
  { key: 'social.youtube.url', value: '', type: 'text', label: 'YouTube URL', group: 'social' },

  // SEO
  { key: 'seo.default.title', value: 'Live Miracle — Broadcast Studios & Live Production Infrastructure', type: 'text',
    label: 'Default meta title', group: 'seo' },
  { key: 'seo.default.description',
    value: 'Live Miracle designs, builds and operates professional broadcast studio environments — studio production, custom studio design, streaming technology, production staff and technical operations across Georgia, Armenia, Bulgaria and Ukraine.',
    type: 'text', label: 'Default meta description', group: 'seo' },
  { key: 'seo.robots', value: 'index,follow', type: 'text', label: 'Default robots directive', group: 'seo' },
  { key: 'seo.og.image', value: '/og-image.png', type: 'text', label: 'Default OG image path', group: 'seo' },

  // Forms
  { key: 'forms.rate_limit.window_s', value: '3600', type: 'number', label: 'Form rate-limit window (seconds)', group: 'forms' },
  { key: 'forms.rate_limit.max', value: '5', type: 'number', label: 'Max submissions per window per IP', group: 'forms' },
  { key: 'forms.min_fill_seconds', value: '3', type: 'number', label: 'Minimum form fill time (seconds)', group: 'forms',
    hint: 'Submissions faster than this are treated as automated.' },

  // Analytics
  { key: 'analytics.enabled', value: 'true', type: 'bool', label: 'Enable privacy-conscious analytics', group: 'analytics' },
  { key: 'analytics.retention_days', value: '365', type: 'number', label: 'Analytics retention (days)', group: 'analytics' },
];

// ---------------------------------------------------------------------------
// Default SEO per route
// ---------------------------------------------------------------------------

export const SEO_ROUTES = [
  { route: '/', title: 'Live Miracle — Broadcast Studios & Live Production Infrastructure',
    description: 'We build the studios behind live broadcast. Studio design, production infrastructure, streaming technology and trained production teams.' },
  { route: '/about', title: 'About — Live Miracle',
    description: 'Live Miracle combines physical studio environments, production technology and trained people into one integrated operation.' },
  { route: '/services', title: 'Services — Live Miracle',
    description: 'Full studio provision, custom studio design, shared production environments, streaming technology, production staff and training.' },
  { route: '/studios', title: 'Studio Environments — Live Miracle',
    description: 'Ten distinct broadcast studio environments, each built to a different visual brief and production standard.' },
  { route: '/gallery', title: 'Gallery — Live Miracle',
    description: 'Studio environments, control rooms, camera positions, production and technology.' },
  { route: '/contact', title: 'Contact — Live Miracle',
    description: "Let's build something live. Contact Live Miracle about studio production, design, streaming technology and production teams." },
  { route: '/demo', title: 'Request a Studio Demo — Live Miracle',
    description: 'Request a demonstration of a Live Miracle studio environment and discuss your production requirements.' },
  { route: '/privacy', title: 'Privacy Policy — Live Miracle', description: 'How Live Miracle handles information submitted through this website.' },
  { route: '/terms', title: 'Terms of Use — Live Miracle', description: 'Terms governing use of the Live Miracle website.' },
  { route: '/cookies', title: 'Cookie Policy — Live Miracle', description: 'How Live Miracle uses cookies and privacy-conscious analytics.' },
];

export const PAGES = [
  { slug: '', title: 'Home', nav_label: 'Home', show_in_nav: 1, sort_order: 1 },
  { slug: 'about', title: 'About', nav_label: 'About', show_in_nav: 1, sort_order: 2 },
  { slug: 'services', title: 'Services', nav_label: 'Services', show_in_nav: 1, sort_order: 3 },
  { slug: 'studios', title: 'Studios', nav_label: 'Studios', show_in_nav: 1, sort_order: 4 },
  { slug: 'gallery', title: 'Gallery', nav_label: 'Gallery', show_in_nav: 1, sort_order: 5 },
  { slug: 'contact', title: 'Contact', nav_label: 'Contact', show_in_nav: 1, sort_order: 6 },
  { slug: 'demo', title: 'Request a Demo', nav_label: 'Demo', show_in_nav: 0, sort_order: 7 },
  { slug: 'privacy', title: 'Privacy Policy', nav_label: 'Privacy', show_in_nav: 0, sort_order: 8 },
  { slug: 'terms', title: 'Terms of Use', nav_label: 'Terms', show_in_nav: 0, sort_order: 9 },
  { slug: 'cookies', title: 'Cookie Policy', nav_label: 'Cookies', show_in_nav: 0, sort_order: 10 },
];
