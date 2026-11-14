/**
 * Simulated sites used by the test lab. Each request declares the decision the
 * engine should reach; selectors list what should be hidden or left visible.
 */

export const DEMO_SITES = [
  {
    id: 'dailybyte',
    name: 'The Daily Byte',
    category: 'News',
    host: 'news.dailybyte.test',
    blurb: 'A busy newsroom: sponsored rail, leaderboard and a newsletter takeover.',
    requests: [
      { label: 'Article feed', url: 'https://news.dailybyte.test/api/feed.json', type: 'xmlhttprequest', expect: 'allowed' },
      { label: 'Hero photo', url: 'https://news.dailybyte.test/img/city-hero.jpg', type: 'image', expect: 'allowed' },
      { label: 'Text face', url: 'https://news.dailybyte.test/fonts/editorial.woff2', type: 'font', expect: 'allowed' },
      { label: 'Ad loader', url: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', type: 'script', expect: 'blocked' },
      { label: 'Leaderboard creative', url: 'https://ad.doubleclick.net/ddm/adi/N4821/banner.gif', type: 'image', expect: 'blocked' },
      { label: 'Taboola feed', url: 'https://cdn.taboola.com/libtrc/network/loader.js', type: 'script', expect: 'blocked' },
      { label: 'Tag manager', url: 'https://www.googletagmanager.com/gtm.js?id=GTM-42X', type: 'script', expect: 'blocked' },
      { label: 'Analytics beacon', url: 'https://www.google-analytics.com/collect?v=1&t=pageview', type: 'ping', expect: 'blocked' },
    ],
    hide: ['.ad-leaderboard', '.sponsored-rail', '.newsletter-popup'],
    keep: ['.article-body', '.hero-image'],
  },
  {
    id: 'shoply',
    name: 'Shoply',
    category: 'Shopping',
    host: 'shop.shoply.test',
    blurb: 'A retailer retargeting you across the web from every product page.',
    requests: [
      { label: 'Product feed', url: 'https://shop.shoply.test/api/products?sort=new', type: 'xmlhttprequest', expect: 'allowed' },
      { label: 'Product image', url: 'https://cdn.shoply.test/img/chair-01.webp', type: 'image', expect: 'allowed' },
      { label: 'Recommendations', url: 'https://static.criteo.net/js/ld/publishertag.prebid.js', type: 'script', expect: 'blocked' },
      { label: 'Retargeting pixel', url: 'https://www.facebook.com/tr?id=99812&ev=ViewContent', type: 'image', expect: 'blocked' },
      { label: 'Bid request', url: 'https://match.adsrvr.org/track/rid?ttd_pid=77', type: 'xmlhttprequest', expect: 'blocked' },
      { label: 'Affiliate cookie sync', url: 'https://cm.adform.net/cookie?redirect_url=x', type: 'image', expect: 'blocked' },
    ],
    hide: ['.sponsored-card', '.ad-slot'],
    keep: ['.product-card', '.product-grid'],
  },
  {
    id: 'tubetime',
    name: 'TubeTime',
    category: 'Video',
    host: 'watch.tubetime.test',
    blurb: 'A video player that would love a thirty-second pre-roll before the recipe.',
    requests: [
      { label: 'Video segment', url: 'https://cdn.watch.tubetime.test/hls/recipe-720p-003.ts', type: 'media', expect: 'allowed' },
      { label: 'Player bundle', url: 'https://watch.tubetime.test/assets/player.js', type: 'script', expect: 'allowed' },
      { label: 'Pre-roll VAST', url: 'https://search.spotxchange.com/vast/2.0/12345', type: 'xmlhttprequest', expect: 'blocked' },
      { label: 'Ad tag', url: 'https://pubads.g.doubleclick.net/gampad/ads?iu=/1234/preroll', type: 'xmlhttprequest', expect: 'blocked' },
      { label: 'Session tracking', url: 'https://www.google-analytics.com/collect?t=timing', type: 'ping', expect: 'blocked' },
      { label: 'Thumbnail', url: 'https://cdn.watch.tubetime.test/img/recipe-thumb.jpg', type: 'image', expect: 'allowed' },
    ],
    hide: ['.pre-roll-ad', '.companion-ad', '.sticky-social'],
    keep: ['.player', '.video-title'],
  },
  {
    id: 'devnotes',
    name: 'DevNotes',
    category: 'Blog',
    host: 'devnotes.test',
    blurb: 'A technical blog with a cookie wall and one very persistent reading list.',
    requests: [
      { label: 'Post data', url: 'https://devnotes.test/api/posts/42', type: 'xmlhttprequest', expect: 'allowed' },
      { label: 'Avatar', url: 'https://avatars.githubusercontent.com/u/1024', type: 'image', expect: 'allowed' },
      { label: 'Code font', url: 'https://devnotes.test/fonts/mono.woff2', type: 'font', expect: 'allowed' },
      { label: 'Sponsored reads', url: 'https://widgets.outbrain.com/outbrain.js', type: 'script', expect: 'blocked' },
      { label: 'Bounce tracking', url: 'https://www.google-analytics.com/collect?t=event', type: 'ping', expect: 'blocked' },
      { label: 'Facebook pixel', url: 'https://connect.facebook.net/en_US/fbevents.js', type: 'script', expect: 'blocked' },
    ],
    hide: ['.cookie-banner', '.taboola-widget'],
    keep: ['.post-body', '.code-block'],
  },
]

export function siteByHost(host) {
  return DEMO_SITES.find((site) => site.host === host)
}
