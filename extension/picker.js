// Click-to-block picker.
//
// The person asks to block one element; this script outlines whatever sits
// under the cursor, turns the element they click into a CSS selector that
// matches only it, and hands that selector to the worker. From then on the
// element is hidden on that site like any other ad slot.
//
// It listens for the "luma:pick" message and does nothing until then, so an
// idle page pays no cost for it.

const OVERLAY_ID = 'luma-picker-overlay'
const BANNER_ID = 'luma-picker-banner'
const TOAST_ID = 'luma-picker-toast'
const MAX_DEPTH = 4

let active = false
let box = null
let label = null
let current = null

function cssEscapeIdent(value) {
  if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(value)
  return String(value).replace(/([^a-zA-Z0-9_-])/g, '\\$1')
}

/** A class worth putting in a selector: readable, written by a person. */
function stableClass(name) {
  return /^[a-zA-Z][a-zA-Z-]{2,39}$/.test(name) && !/^(css|sc|jsx|ng|v)-/i.test(name)
}

function unique(selector) {
  try {
    return document.querySelectorAll(selector).length === 1
  } catch {
    return false
  }
}

/** One level of a selector: a stable class when there is one, else the position. */
function pieceFor(node) {
  const tag = node.tagName.toLowerCase()
  const classes = Array.from(node.classList || []).filter(stableClass)
  const parent = node.parentElement
  const siblings = parent
    ? Array.from(parent.children).filter((child) => child.tagName === node.tagName)
    : []
  const position = siblings.length > 1 ? ':nth-of-type(' + (siblings.indexOf(node) + 1) + ')' : ''
  if (!classes.length) return tag + position
  // One class is enough while it is the only sibling with that name; two
  // identical siblings need their position as well.
  const first = tag + '.' + cssEscapeIdent(classes[0])
  const sharing = siblings.filter((child) => child.classList.contains(classes[0])).length
  if (sharing <= 1) return first
  return tag + '.' + classes.slice(0, 2).map(cssEscapeIdent).join('.') + position
}

/**
 * The shortest selector that matches this element and nothing else. It walks
 * up a few levels, because the element often has no stable class of its own.
 */
function selectorFor(element) {
  if (!element || element.nodeType !== 1) return ''
  const tag = element.tagName.toLowerCase()
  if (tag === 'html' || tag === 'body') return ''
  if (element.id && /^[a-zA-Z][\w-]*$/.test(element.id)) {
    const idSelector = '#' + cssEscapeIdent(element.id)
    if (unique(idSelector)) return idSelector
  }
  const parts = []
  let node = element
  while (node && node.nodeType === 1 && parts.length < MAX_DEPTH) {
    if (node.id && /^[a-zA-Z][\w-]*$/.test(node.id)) {
      const idSelector = '#' + cssEscapeIdent(node.id)
      if (unique(idSelector)) {
        parts.unshift(idSelector)
        return parts.join(' > ')
      }
    }
    parts.unshift(pieceFor(node))
    const candidate = parts.join(' > ')
    if (unique(candidate)) return candidate
    node = node.parentElement
  }
  return parts.join(' > ')
}

function overlay() {
  let root = document.getElementById(OVERLAY_ID)
  if (root) return root
  root = document.createElement('div')
  root.id = OVERLAY_ID
  root.setAttribute('aria-hidden', 'true')
  root.style.cssText =
    'position:fixed;pointer-events:none;z-index:2147483647;border:2px solid #ff5522;' +
    'border-radius:4px;background:rgba(255,85,34,0.12);box-shadow:0 0 0 2000px rgba(10,10,10,0.28);'
  box = document.createElement('div')
  box.style.cssText = 'position:absolute;left:0;top:0;transform:translateY(-100%);'
  label = document.createElement('span')
  label.style.cssText =
    'display:inline-block;max-width:60vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;' +
    'padding:2px 6px;border-radius:3px 3px 0 0;background:#ff5522;color:#fff;' +
    'font:600 11px/1.5 system-ui,-apple-system,sans-serif;'
  box.appendChild(label)
  root.appendChild(box)
  document.documentElement.appendChild(root)
  return root
}

function banner() {
  let node = document.getElementById(BANNER_ID)
  if (node) return node
  node = document.createElement('div')
  node.id = BANNER_ID
  node.textContent = 'Click the element to block it — Esc to cancel'
  node.style.cssText =
    'position:fixed;left:50%;top:16px;transform:translateX(-50%);z-index:2147483647;' +
    'padding:8px 14px;border-radius:999px;background:#1e1e1e;color:#fff;' +
    'font:600 12px/1.4 system-ui,-apple-system,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,0.28);' +
    'pointer-events:none;'
  document.documentElement.appendChild(node)
  return node
}

function toast(text) {
  const node = document.createElement('div')
  node.id = TOAST_ID
  node.textContent = text
  node.style.cssText =
    'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483647;' +
    'padding:10px 16px;border-radius:8px;background:#1e1e1e;color:#fff;' +
    'font:600 12px/1.4 system-ui,-apple-system,sans-serif;box-shadow:0 8px 28px rgba(0,0,0,0.3);' +
    'pointer-events:none;'
  document.documentElement.appendChild(node)
  window.setTimeout(() => node.remove(), 1800)
}

function describe(element) {
  if (!element || element.nodeType !== 1) return ''
  const tag = element.tagName.toLowerCase()
  const id = element.id ? '#' + element.id : ''
  const classes = Array.from(element.classList || []).filter(stableClass).slice(0, 2)
  return tag + id + (classes.length ? '.' + classes.join('.') : '')
}

function targetAt(event) {
  const element = document.elementFromPoint(event.clientX, event.clientY)
  if (!element || element.closest('#' + OVERLAY_ID)) return null
  return element
}

function outline(element) {
  if (!element) return
  const rect = element.getBoundingClientRect()
  const root = overlay()
  root.style.left = rect.left + 'px'
  root.style.top = rect.top + 'px'
  root.style.width = rect.width + 'px'
  root.style.height = rect.height + 'px'
  label.textContent = describe(element)
}

function onMove(event) {
  const element = targetAt(event)
  if (!element) return
  current = element
  outline(element)
}

function onClick(event) {
  if (!active) return
  const element = targetAt(event) || current
  if (!element) return
  // The click is the person's choice, not the page's.
  event.preventDefault()
  event.stopPropagation()
  event.stopImmediatePropagation()
  const selector = selectorFor(element)
  if (!selector) {
    toast('That element cannot be blocked.')
    stop()
    return
  }
  try {
    chrome.runtime.sendMessage({ type: 'luma:pick:save', selector, host: location.hostname }, (reply) => {
      if (reply && reply.ok) toast('Blocked on this site')
      else toast('Luma could not save that element.')
    })
  } catch {
    toast('Luma could not reach its background service.')
  }
  stop()
}

function onKey(event) {
  if (event.key === 'Escape') {
    stop()
  }
}

function start() {
  if (active) return
  active = true
  current = null
  window.addEventListener('mousemove', onMove, true)
  window.addEventListener('click', onClick, true)
  window.addEventListener('keydown', onKey, true)
  banner()
}

function stop() {
  active = false
  current = null
  window.removeEventListener('mousemove', onMove, true)
  window.removeEventListener('click', onClick, true)
  window.removeEventListener('keydown', onKey, true)
  document.getElementById(OVERLAY_ID)?.remove()
  document.getElementById(BANNER_ID)?.remove()
}

// A page can be injected twice (the worker retries after a reload); the flag
// keeps one listener, not two.
if (!window.__lumaPickerReady) {
  window.__lumaPickerReady = true
  // Reachable for the extension's own checks.
  window.__lumaPickSelector = selectorFor
  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (message?.type !== 'luma:pick') return false
    start()
    respond?.({ ok: true })
    return false
  })
}
