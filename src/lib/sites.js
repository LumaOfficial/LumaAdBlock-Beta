import { hostnameOf, hostMatches } from './engine'

/**
 * Per-site protection.
 *
 * A site has exactly one state:
 *   protected  everything in the filter lists applies
 *   paused     the person stopped filtering for this site, on purpose and for
 *              now; the rest of the browser keeps blocking
 *   trusted    the site is on the allowlist and is left alone completely
 *
 * The state is stored as host names in the settings, so it travels with the
 * account and reaches the extension the same way the lists do.
 */

/** "https://News.Example.com/story" reads as "news.example.com". */
export function siteHost(value) {
  return hostnameOf(String(value || '').trim())
}

/** A site is paused when it or a parent domain it belongs to is on the list. */
export function isSitePaused(pausedSites, host) {
  const h = String(host || '').toLowerCase()
  if (!h) return false
  return (pausedSites || []).some((entry) => hostMatches(h, entry))
}

/** Trusted wins over paused: a trusted site is not filtered either way. */
export function siteMode(settings, host) {
  if (!host) return 'protected'
  if (isSitePaused(settings?.allowlist, host)) return 'trusted'
  if (isSitePaused(settings?.pausedSites, host)) return 'paused'
  return 'protected'
}

export const SITE_LABELS = {
  protected: 'Protected',
  paused: 'Paused here',
  trusted: 'Trusted',
}
