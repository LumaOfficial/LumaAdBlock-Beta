// YouTube ad handling.
//
// YouTube delivers ads from its own domain, so network rules alone cannot
// remove them without breaking playback. This script works inside the player:
// it skips or fast-forwards the ad video, clicks the skip button, closes
// overlay ads and removes the "ad blockers are not allowed" dialog. It only
// runs while protection is on for this site.

const SETTINGS_KEY = 'luma:settings'
const TICK_MS = 500

let payload = null
let mutedByUs = false
let restoreMuted = false

function normalizeHost(value) {
  const text = String(value || '').trim().toLowerCase()
  if (!text) return ''
  try {
    const parsed = new URL(/^[a-z][a-z0-9+.-]*:\/\//.test(text) ? text : 'http://' + text)
    return parsed.hostname
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

/**
 * Protection off, the core list off, this site allowlisted or paused for now:
 * do nothing.
 */
function active() {
  if (!payload) return true
  if (payload.protection === false) return false
  const lists = payload.dashboard && payload.dashboard.lists
  if (lists && lists['luma-core'] === false) return false
  const allowlist = (payload.dashboard && payload.dashboard.allowlist) || []
  if (allowlist.some((entry) => hostMatches(location.hostname, entry))) return false
  const paused = (payload.dashboard && payload.dashboard.paused) || []
  return !paused.some((entry) => hostMatches(location.hostname, entry))
}

function player() {
  return (
    document.getElementById('movie_player') ||
    document.querySelector('.html5-video-player') ||
    document.querySelector('ytd-player')
  )
}

// Only the player's own ad classes count. An ad overlay element can stay in
// the page after the ad ends (hidden by the hiding stylesheet), and treating
// it as an ad would seek the person's real video to its end.
function adPlaying(container) {
  return Boolean(
    container &&
      (container.classList.contains('ad-showing') || container.classList.contains('ad-interrupting')),
  )
}

function clickFirst(root, selectors) {
  for (const selector of selectors) {
    const button = root.querySelector(selector)
    if (button && !button.disabled) {
      button.click()
      return true
    }
  }
  return false
}

/**
 * Jump to the end of the ad. Seeking is the only way to clear an unskippable
 * ad; the player then moves on to the requested video.
 */
function clearAd(container) {
  const video = container.querySelector('video.html5-main-video, video.video-stream')
  if (video) {
    if (!mutedByUs) {
      restoreMuted = video.muted
      mutedByUs = true
    }
    video.muted = true
    try {
      if (Number.isFinite(video.duration) && video.duration > 0) {
        const target = Math.max(video.duration - 0.1, 0)
        if (video.currentTime < target) video.currentTime = target
      }
      if (video.paused) {
        const played = video.play()
        if (played && played.catch) played.catch(() => {})
      }
    } catch {
      /* a seeking-restricted ad simply plays out */
    }
  }

  clickFirst(container, [
    '.ytp-ad-skip-button',
    '.ytp-ad-skip-button-modern',
    '.ytp-skip-ad-button',
    '.ytp-ad-skip-button-slot button',
    '.ytp-ad-overlay-close-button',
  ])
  clickFirst(document, ['.ytp-ad-overlay-close-button', '.ytp-ad-image-overlay .ytp-ad-overlay-close-button'])
}

/** Playback continues once the dialog is gone. */
function dismissBlockNotice() {
  const dialog = document.querySelector('ytd-enforcement-message-view-model')
  if (!dialog) return
  clickFirst(dialog, ['#dismiss-button', 'button'])
  const shell = dialog.closest('tp-yt-paper-dialog') || dialog
  shell.remove()
  const container = player()
  if (container && typeof container.playVideo === 'function') {
    try {
      container.playVideo()
    } catch {
      /* the player is not ready yet */
    }
  }
}

function restoreSound(container) {
  if (!mutedByUs) return
  const video = container && container.querySelector('video.html5-main-video, video.video-stream')
  if (video) video.muted = restoreMuted
  mutedByUs = false
}

function tick() {
  if (!active()) {
    restoreSound(player())
    return
  }
  dismissBlockNotice()
  const container = player()
  if (!container) return
  if (adPlaying(container)) clearAd(container)
  else restoreSound(container)
}

chrome.storage.local.get(SETTINGS_KEY).then((stored) => {
  payload = stored[SETTINGS_KEY] || null
  tick()
})

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes[SETTINGS_KEY]) return
  payload = changes[SETTINGS_KEY].newValue || null
  if (!active()) restoreSound(player())
})

window.setInterval(tick, TICK_MS)
document.addEventListener('yt-navigate-finish', tick)
document.addEventListener('yt-page-data-updated', tick)
