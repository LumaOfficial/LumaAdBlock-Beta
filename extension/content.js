// Applies the element-hiding selectors the dashboard writes as custom rules.
// The bundled lists ship as static stylesheets, so this only handles the
// selectors the user adds themselves.
const SETTINGS_KEY = 'luma:settings'
const STYLE_ID = 'luma-custom-cosmetic'

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

function selectorsFor(payload) {
  const hidden = new Set()
  if (!payload || !payload.protection) return hidden
  const cosmetic = payload.cosmeticSelectors || { generic: [], site: {} }
  const host = location.hostname
  // An allowlisted site is left exactly as it is, custom hiding included.
  const allowlist = (payload.dashboard && payload.dashboard.allowlist) || []
  if (allowlist.some((entry) => hostMatches(host, entry))) return hidden

  for (const selector of cosmetic.generic || []) hidden.add(selector)
  for (const [domain, selectors] of Object.entries(cosmetic.site || {})) {
    if (!hostMatches(host, domain)) continue
    for (const selector of selectors) hidden.add(selector)
  }
  return hidden
}

function apply(payload) {
  document.getElementById(STYLE_ID)?.remove()
  const selectors = selectorsFor(payload)
  if (!selectors.size) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = [...selectors].join(',\n') + ' { display: none !important; }'
  ;(document.head || document.documentElement).appendChild(style)
}

chrome.storage.local.get(SETTINGS_KEY).then((stored) => apply(stored[SETTINGS_KEY]))

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes[SETTINGS_KEY]) apply(changes[SETTINGS_KEY].newValue)
})
