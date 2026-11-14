/**
 * Consent banners and the popups that hold a page hostage until answered.
 */
export const CONSENT = [
  {
    id: 'onetrust',
    label: 'OneTrust',
    domain: 'onetrust.com',
    blurb: 'The cookie banner that holds the page until you answer.',
    type: 'script',
    paths: ['/consent/123/otnotice.js', '/geo'],
  },
  {
    id: 'cookiebot',
    label: 'Cookiebot',
    domain: 'cookiebot.com',
    blurb: 'Consent banners that gate other scripts.',
    type: 'script',
    paths: ['/uc.js', '/ccm'],
  },
  {
    id: 'trustarc',
    label: 'TrustArc',
    domain: 'trustarc.com',
    blurb: 'Consent management banners.',
    type: 'script',
    paths: ['/consent/123.js', '/truste'],
  },
  {
    id: 'quantcast-choice',
    label: 'Quantcast Choice',
    domain: 'quantcast.com',
    blurb: 'A consent banner that also measures you.',
    type: 'script',
    paths: ['/choice.js', '/consent'],
  },
  {
    id: 'osano',
    label: 'Osano',
    domain: 'osano.com',
    blurb: 'Consent popups and cookie scanning.',
    type: 'script',
    paths: ['/js/osano.js', '/consent'],
  },
  {
    id: 'termly',
    label: 'Termly',
    domain: 'termly.io',
    blurb: 'Cookie banners and policy widgets.',
    type: 'script',
    paths: ['/embed/consent.js', '/consent'],
  },
  {
    id: 'usercentrics',
    label: 'Usercentrics',
    domain: 'usercentrics.eu',
    blurb: 'Consent dialogs that gate everything else.',
    type: 'script',
    paths: ['/settings/123.js', '/consent'],
  },
  {
    id: 'didomi',
    label: 'Didomi',
    domain: 'didomi.io',
    blurb: 'Consent notices across European sites.',
    type: 'script',
    paths: ['/consent/123.js', '/consent'],
  },
]
