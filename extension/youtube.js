// YouTube ad handling.
//
// YouTube delivers ads from its own domain, so network rules alone cannot
// remove them without breaking playback. This script works inside the player:
// it mutes the ad, clicks Skip and jumps to the end of the ad video, so the ad
// is really removed — not just covered up while it keeps playing behind a
// hidden overlay. The real video is never hidden either: a hidden player would
// leave the sound running with nothing on screen.
//
// It only runs while protection is on for this site.

const SETTINGS_KEY = 'luma:settings'
const HIDDEN_ATTR = 'data-luma-hidden'
const TICK_MS = 400
// A seek is refused on some ads. Past a couple of tries the ad is played at
// this rate instead, so it cannot run for its full length.
const FAST_RATE = 16

let payload = null
let adAttempts = 0
let mutedByUs = false
let restoreMuted = false
let boostedRate = false
let restoreRate = 1

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

/** The one video element the player draws into: ad and video share it. */
function videoOf(container) {
  const scoped =
    container && container.querySelector('video.html5-main-video, video.video-stream')
  return scoped || document.querySelector('video.html5-main-video, video.video-stream')
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

/** No ad sound: the video is muted for as long as the ad is on screen. */
function silence(video) {
  if (!video) return
  if (!mutedByUs) {
    restoreMuted = video.muted
    mutedByUs = true
  }
  if (!video.muted) video.muted = true
}

/** Put the person's own sound and speed back once the ad is gone. */
function restorePlayback(video) {
  if (!mutedByUs && !boostedRate) return
  if (video) {
    if (mutedByUs) video.muted = restoreMuted
    if (boostedRate) {
      try {
        video.playbackRate = restoreRate
      } catch {
        /* the player keeps the rate until the next navigation */
      }
    }
  }
  mutedByUs = false
  boostedRate = false
}

/**
 * Remove the ad that is playing right now. The skip button ends skippable ads;
 * for the rest, jumping to the last frame of the ad is what actually clears it.
 */
function clearAd(container) {
  const video = videoOf(container)

  clickFirst(container, [
    '.ytp-ad-skip-button',
    '.ytp-ad-skip-button-modern',
    '.ytp-skip-ad-button',
    '.ytp-ad-skip-button-slot button',
  ])
  clickFirst(document, [
    '.ytp-ad-overlay-close-button',
    '.ytp-ad-image-overlay .ytp-ad-overlay-close-button',
  ])

  if (!video) return
  silence(video)
  adAttempts += 1

  const duration = Number(video.duration)
  if (Number.isFinite(duration) && duration > 0) {
    const target = Math.max(duration - 0.05, 0)
    if (video.currentTime < target) {
      try {
        video.currentTime = target
      } catch {
        /* this ad refuses seeks; the rate fallback below covers it */
      }
    }
  }

  // Duration is unknown for the first moments of an ad, and some ads ignore
  // seeks. After a couple of attempts the ad is sped up while muted instead of
  // being allowed to play out at normal speed.
  if (adAttempts > 2 && !boostedRate) {
    try {
      restoreRate = video.playbackRate || 1
      video.playbackRate = FAST_RATE
      boostedRate = true
    } catch {
      /* the next tick tries again */
    }
  }

  if (video.paused) {
    const played = video.play()
    if (played && played.catch) played.catch(() => {})
  }
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

/**
 * The player and its video are never hidden, by this script or by the hiding
 * stylesheet: hiding them would keep the audio going with no picture. Anything
 * already hidden around the player is revealed again.
 */
function protectPlayer(container) {
  for (const start of [container, videoOf(container)]) {
    let node = start
    while (node && node.nodeType === 1) {
      if (node.hasAttribute(HIDDEN_ATTR)) node.removeAttribute(HIDDEN_ATTR)
      node = node.parentElement
    }
  }
}

function tick() {
  if (!active()) {
    adAttempts = 0
    const container = player()
    if (container) protectPlayer(container)
    restorePlayback(videoOf(container))
    return
  }
  dismissBlockNotice()
  const container = player()
  if (!container) return
  protectPlayer(container)
  if (adPlaying(container)) {
    clearAd(container)
    return
  }
  adAttempts = 0
  restorePlayback(videoOf(container))
}

chrome.storage.local.get(SETTINGS_KEY).then((stored) => {
  payload = stored[SETTINGS_KEY] || null
  tick()
})

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes[SETTINGS_KEY]) return
  payload = changes[SETTINGS_KEY].newValue || null
  if (!active()) {
    adAttempts = 0
    restorePlayback(videoOf(player()))
  }
})

window.setInterval(tick, TICK_MS)
document.addEventListener('yt-navigate-finish', tick)
document.addEventListener('yt-page-data-updated', tick)
