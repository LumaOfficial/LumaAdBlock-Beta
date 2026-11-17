// Hides the elements the filter lists point at, in whichever style the person
// chose in the dashboard:
//
//   hidden  the slot is removed at document_start and leaves nothing behind
//   visual  the slot is outlined and badged for a moment, then collapses, so
//           it is obvious what went and that nothing useful went with it
//
// It also reports what it hid, which is what makes the dashboard's numbers
// real: the browser does not expose matched network rules to a store install.
const SETTINGS_KEY = 'luma:settings'
const STYLE_ID = 'luma-cosmetic'
const HIDDEN_ATTR = 'data-luma-hidden'
const ZAP_MS = 900
const REPORT_MS = 600

let bundled = null
let active = { selectors: [], visual: false }
const seen = new WeakSet()
let pending = 0
let reportTimer = 0
let sweepTimer = 0

const observer = new MutationObserver(() => {
  if (!active.selectors.length) return
  if (sweepTimer) return
  sweepTimer = window.setTimeout(() => {
    sweepTimer = 0
    sweep()
  }, 250)
})

function normalizeHost(value) {
  const text = String(value || '').trim().toLowerCase()
  if (!text) return ''
  try {
    return new URL(/^[a-z][a-z0-9+.-]*:\/\//.test(text) ? text : 'http://' + text).hostname
  } catch {
    return ''
  }
}

function hostMatches(host, domain) {
  const h = String(host || '').toLowerCase()
  const d = normalizeHost(domain)
  if (!h || !d) return false
  return h === d || h.endsWith('.' + d)
}

// A page's video player is never hidden. Hiding it would leave the video (or
// an ad) playing with no picture at all, which is worse than the ad.
const PLAYER_TARGET = 'video, #movie_player, .html5-video-player, .html5-video-container, ytd-player'

/**
 * True when a selector hits the player itself or any element that wraps it.
 * Such a selector is dropped instead of hidden.
 */
function touchesPlayer(nodes) {
  for (const node of nodes) {
    if (!node || node.nodeType !== 1) continue
    if (node.matches(PLAYER_TARGET)) return true
    if (node.querySelector(PLAYER_TARGET)) return true
  }
  return false
}

async function loadBundled() {
  if (bundled) return bundled
  try {
    const response = await fetch(chrome.runtime.getURL('cosmetic/selectors.json'))
    bundled = await response.json()
  } catch {
    bundled = {}
  }
  return bundled
}

/** Every selector that applies here: the enabled lists' plus the person's own. */
function selectorsFor(payload) {
  const selectors = new Set()
  if (!payload || !payload.protection) return []
  const host = location.hostname
  // An allowlisted site is left exactly as it is, custom hiding included.
  const allowlist = (payload.dashboard && payload.dashboard.allowlist) || []
  if (allowlist.some((entry) => hostMatches(host, entry))) return []
  // A paused site keeps loading its own ads; the rest of the browser does not.
  const paused = (payload.dashboard && payload.dashboard.paused) || []
  if (paused.some((entry) => hostMatches(host, entry))) return []

  for (const id of payload.enabledLists || []) {
    for (const selector of (bundled && bundled[id]) || []) selectors.add(selector)
  }
  const cosmetic = payload.cosmeticSelectors || { generic: [], site: {} }
  for (const selector of cosmetic.generic || []) selectors.add(selector)
  for (const [domain, list] of Object.entries(cosmetic.site || {})) {
    if (!hostMatches(host, domain)) continue
    for (const selector of list) selectors.add(selector)
  }
  // Elements picked with the click-to-block tool, for this site only.
  const picked = (payload.dashboard && payload.dashboard.pickerRules) || {}
  for (const [domain, list] of Object.entries(picked)) {
    if (!hostMatches(host, domain)) continue
    for (const selector of list || []) selectors.add(selector)
  }
  return [...selectors]
}

function cssFor(selectors, visual) {
  // One rule per selector: a selector a browser refuses to parse then only
  // loses itself instead of voiding the whole sheet.
  const hide = selectors
    .map((selector) =>
      visual
        ? selector + ' { visibility: hidden !important; }\n'
        : selector + ' { display: none !important; }\n',
    )
    .join('')
  return (
    hide +
    '[' + HIDDEN_ATTR + '] { display: none !important; }\n' +
    '.luma-zap { position: fixed; pointer-events: none; z-index: 2147483647;' +
    ' border: 1px dashed #ff5522; border-radius: 6px; background: rgba(255, 85, 34, 0.08); }\n' +
    '.luma-zap::after { content: "Luma blocked this"; position: absolute; left: 0; top: 0;' +
    ' transform: translateY(-100%); padding: 2px 6px; border-radius: 4px 4px 0 0;' +
    ' font: 600 11px/1.5 system-ui, -apple-system, sans-serif; color: #fff; background: #ff5522;' +
    ' white-space: nowrap; }\n'
  )
}

/** Outline where the slot was, then collapse it. */
function zap(element) {
  const rect = element.getBoundingClientRect()
  const overlay = document.createElement('div')
  overlay.className = 'luma-zap'
  overlay.setAttribute('aria-hidden', 'true')
  overlay.style.left = rect.left + 'px'
  overlay.style.top = rect.top + 'px'
  overlay.style.width = rect.width + 'px'
  overlay.style.height = rect.height + 'px'
  overlay.style.display = rect.width && rect.height ? 'block' : 'none'
  ;(document.body || document.documentElement).appendChild(overlay)
  window.setTimeout(() => {
    element.setAttribute(HIDDEN_ATTR, '')
    overlay.remove()
  }, ZAP_MS)
}

function report() {
  if (reportTimer || !pending) return
  reportTimer = window.setTimeout(() => {
    reportTimer = 0
    const count = pending
    pending = 0
    try {
      const sent = chrome.runtime.sendMessage({ type: 'luma:hidden', count, host: location.hostname })
      if (sent && sent.catch) sent.catch(() => {})
    } catch {
      /* the worker may be asleep; the next page reports again */
    }
  }, REPORT_MS)
}

/** Draw the hiding stylesheet for the selectors still in force. */
function render() {
  observer.disconnect()
  document.getElementById(STYLE_ID)?.remove()
  if (!active.selectors.length) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = cssFor(active.selectors, active.visual)
  ;(document.head || document.documentElement).appendChild(style)
  observer.observe(document.documentElement, { childList: true, subtree: true })
}

/** Count what this page has hidden so far, and outline it in Visual mode. */
function sweep() {
  let fresh = 0
  const dropped = []
  for (const selector of active.selectors) {
    let nodes = []
    try {
      nodes = document.querySelectorAll(selector)
    } catch {
      continue
    }
    if (!nodes.length) continue
    // The player appeared after the stylesheet was drawn: drop the selector
    // and redraw so the video is never left hidden.
    if (touchesPlayer(nodes)) {
      dropped.push(selector)
      continue
    }
    for (const element of nodes) {
      if (seen.has(element)) continue
      seen.add(element)
      fresh += 1
      if (active.visual) zap(element)
    }
  }
  if (dropped.length) {
    active.selectors = active.selectors.filter((selector) => !dropped.includes(selector))
    render()
  }
  if (!fresh) return
  pending += fresh
  report()
}

async function apply(payload) {
  await loadBundled()
  const selectors = selectorsFor(payload)
  const visual = Boolean(payload && payload.protection && payload.dashboard?.feedback === 'visual')
  active = { selectors, visual }
  if (!selectors.length) {
    observer.disconnect()
    document.getElementById(STYLE_ID)?.remove()
    return
  }
  render()
  sweep()
}

chrome.storage.local.get(SETTINGS_KEY).then((stored) => apply(stored[SETTINGS_KEY]))

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes[SETTINGS_KEY]) apply(changes[SETTINGS_KEY].newValue)
})
