/**
 * Platforms Luma can clean up for you. Each entry is a small pack of filter
 * lines plus the plain-language list of what it removes, so connecting a
 * platform is a switch rather than a new engine.
 *
 * The catalogue is built from real data: sites people actually visit, the ad
 * servers those sites call (./adNetworks) and the ad-slot selectors public
 * filter lists use (./integrationCatalog). The hand-written entries below
 * carry site-specific selectors for platforms whose layouts are well known.
 *
 * Everything runs in the browser on the web version of the platform. Luma
 * never signs in to an account, never reads messages, and sends nothing away.
 */
import { AD_NETWORKS } from './adNetworks'
import { CATALOG } from './integrationCatalog'

export const MAX_INTEGRATIONS = 600

const HAND_WRITTEN = [
  {
    id: 'gmail',
    label: 'Gmail',
    kind: 'Email',
    site: 'mail.google.com',
    blurb: 'Promoted mail and the ad strip that sits above your inbox.',
    removes: ['Promoted messages', 'The ad strip above the inbox', 'Ad requests from Google'],
    lines: [
      '||pagead2.googlesyndication.com^$important,domain=mail.google.com',
      '||googleads.g.doubleclick.net^$important,domain=mail.google.com',
      'mail.google.com##.aKB',
      'mail.google.com##.z0',
      'mail.google.com##.bAK',
    ],
    checks: [
      {
        label: 'Ad script',
        url: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js',
        type: 'script',
      },
      { label: 'Ad exchange', url: 'https://googleads.g.doubleclick.net/pagead/id', type: 'xmlhttprequest' },
    ],
  },
  {
    id: 'outlook',
    label: 'Outlook',
    kind: 'Email',
    site: 'outlook.live.com',
    blurb: 'Sponsored mail and the banner Outlook puts beside your folders.',
    removes: ['Sponsored messages', 'The folder banner', 'Ad requests from MSN'],
    lines: [
      '||ads.msn.com^$important,domain=outlook.live.com',
      'outlook.live.com##[data-testid="adsContainer"]',
      'outlook.live.com##.adBanner',
      'outlook.live.com##[data-testid="promoted-message"]',
    ],
    checks: [{ label: 'Ad server', url: 'https://ads.msn.com/ads/partner.js', type: 'script' }],
  },
  {
    id: 'github',
    label: 'GitHub',
    kind: 'Code',
    site: 'github.com',
    blurb: 'Sponsored cards in the feed and the banner blocks above your repositories.',
    removes: ['Sponsored feed cards', 'The dashboard sponsor banner', 'Explore-page ads'],
    lines: [
      'github.com##.js-sponsored-feed-item',
      'github.com##[data-testid="sponsored-item"]',
      'github.com##.dashboard-sponsors',
      'github.com##.explore-pjax-container .sponsored',
    ],
    checks: [],
  },
  {
    id: 'discord',
    label: 'Discord',
    kind: 'Chat',
    site: 'discord.com',
    blurb: 'Promo cards and upgrade banners that appear in the app and in your servers.',
    removes: ['Upgrade banners', 'Promo cards', 'Nitro upsells'],
    lines: [
      'discord.com##[class*="premiumPromo"]',
      'discord.com##[class*="nitroUpsell"]',
      'discord.com##[class*="upsellBanner"]',
      'discord.com##[class*="promoCard"]',
    ],
    checks: [],
  },
  {
    id: 'slack',
    label: 'Slack',
    kind: 'Chat',
    site: 'app.slack.com',
    blurb: 'Banners promoting plans and add-ons across the workspace.',
    removes: ['Plan promos', 'Add-on banners', 'Trial upsells'],
    lines: [
      'app.slack.com##[data-qa="promo_banner"]',
      'app.slack.com##[class*="promo_banner"]',
      'app.slack.com##[class*="trial_banner"]',
    ],
    checks: [],
  },
  {
    id: 'youtube',
    label: 'YouTube',
    kind: 'Video',
    site: 'www.youtube.com',
    blurb: 'Video ads, the masthead banner and sponsored slots around what you watch.',
    removes: ['Video ads', 'The masthead banner', 'Sponsored shelves', 'Ad requests'],
    lines: [
      '||googleads.g.doubleclick.net^$important,domain=www.youtube.com',
      'www.youtube.com##ytd-promoted-sparkles-web-renderer',
      'www.youtube.com##ytd-display-ad-renderer',
      'www.youtube.com##ytd-ad-slot-renderer',
      'www.youtube.com##.ytp-ad-overlay-slot',
    ],
    checks: [
      {
        label: 'Ad exchange',
        url: 'https://googleads.g.doubleclick.net/pagead/id',
        type: 'xmlhttprequest',
      },
    ],
  },
  {
    id: 'reddit',
    label: 'Reddit',
    kind: 'Social',
    site: 'www.reddit.com',
    blurb: 'Promoted posts in your feed and the ad slots between comments.',
    removes: ['Promoted posts', 'Feed ad slots', 'Ad requests'],
    lines: [
      '||reddit.com/api/ads^$important,domain=www.reddit.com',
      'www.reddit.com##shreddit-ad-post',
      'www.reddit.com##[data-testid="promoted-post"]',
      'www.reddit.com##.promotedlink',
    ],
    checks: [{ label: 'Ad request', url: 'https://www.reddit.com/api/ads.json', type: 'xmlhttprequest' }],
  },
  {
    id: 'x',
    label: 'X',
    kind: 'Social',
    site: 'x.com',
    blurb: 'Promoted posts, trends and the ads woven into your timeline.',
    removes: ['Promoted posts', 'Promoted trends', 'Ad requests'],
    lines: [
      '||ads.twitter.com^$important,domain=x.com',
      'x.com,twitter.com##[data-testid="placementTracking"]',
      'x.com,twitter.com##[data-testid="trend"] [aria-label*="Promoted"]',
    ],
    checks: [{ label: 'Ad server', url: 'https://ads.twitter.com/x/ads.js', type: 'script' }],
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    kind: 'Work',
    site: 'www.linkedin.com',
    blurb: 'Sponsored posts in the feed and the ad column beside it.',
    removes: ['Sponsored posts', 'The ad column', 'Ad requests'],
    lines: [
      '||linkedin.com/li/ads^$important,domain=www.linkedin.com',
      'www.linkedin.com##.feed-shared-update-v2[data-ad-id]',
      'www.linkedin.com##.ad-banner-container',
      'www.linkedin.com##[data-testid="ads-container"]',
    ],
    checks: [
      {
        label: 'Ad request',
        url: 'https://www.linkedin.com/li/ads/tracking',
        type: 'xmlhttprequest',
      },
    ],
  },
  {
    id: 'twitch',
    label: 'Twitch',
    kind: 'Video',
    site: 'www.twitch.tv',
    blurb: 'Display ads around the player and the banners on channel pages.',
    removes: ['Display ads', 'Channel banners', 'Ad requests'],
    lines: [
      '||ads.twitch.tv^$important,domain=www.twitch.tv',
      'www.twitch.tv##[data-a-target="ad-banner"]',
      'www.twitch.tv##.stream-display-ad',
      'www.twitch.tv##[data-testid="ad-slot"]',
    ],
    checks: [{ label: 'Ad server', url: 'https://ads.twitch.tv/ads.js', type: 'script' }],
  },
]

/** One catalog tuple turned into the platform entry the app works with. */
function fromCatalog(group, [id, label, site]) {
  const networks = group.networks.map((key) => AD_NETWORKS[key]).filter(Boolean)
  const named = networks.map((network) => network.label)
  return {
    id,
    label,
    kind: group.kind,
    site,
    blurb: `${label} carries ${named.slice(0, 3).join(', ')} tags and the ad slots they fill.`,
    removes: [
      `Ads served by ${named.slice(0, 2).join(' and ')}`,
      'Sponsored and promoted slots on the page',
      'Ad requests before they load',
    ],
    lines: [
      ...networks.map((network) => `||${network.host}^$important,domain=${site}`),
      ...group.slots.map((selector) => `${site}##${selector}`),
    ],
    // The two busiest servers on this kind of site, screened for real when the
    // person asks what is covered.
    checks: networks.slice(0, 2).map((network) => ({
      label: network.label,
      url: `https://${network.host}${network.path}`,
      type: network.type,
    })),
  }
}

const seen = new Set(HAND_WRITTEN.map((platform) => platform.id))
const CATALOGUE = CATALOG.flatMap((group) =>
  group.sites
    .filter(([id]) => {
      if (seen.has(id)) return false
      seen.add(id)
      return true
    })
    .map((tuple) => fromCatalog(group, tuple)),
)

export const INTEGRATIONS = [...HAND_WRITTEN, ...CATALOGUE]

const BY_ID = new Map(INTEGRATIONS.map((platform) => [platform.id, platform]))

/** The platform with this id, or null for an id this build does not know. */
export function integrationById(id) {
  return BY_ID.get(id) || null
}

/** Only platforms this build knows, once each, in a stable order. */
export function normalizeIntegrations(value) {
  if (!Array.isArray(value)) return []
  const ids = value.map((item) => String(item || '').trim()).filter((id) => BY_ID.has(id))
  return [...new Set(ids)].slice(0, MAX_INTEGRATIONS)
}
