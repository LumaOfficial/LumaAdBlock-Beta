#!/usr/bin/env node
/**
 * Verifies the built extension: manifest shape, generated rulesets, the
 * dashboard bundle, and that the filter engine reaches the right decisions for
 * the requests the lists are built for.
 */
import { execFileSync } from 'node:child_process'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DEFAULT_LISTS, FILTER_LISTS } from '../src/lib/blocklists.js'
import {
  BROWSER_TYPES,
  compileRules,
  parseFilter,
  screenRequest,
  toDeclarativeNetRequest,
} from '../src/lib/engine.js'

const BROWSER_TYPE_NAMES = new Set(Object.values(BROWSER_TYPES))

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = path.join(root, 'extension')
const failures = []

function check(label, condition, detail) {
  if (condition) {
    console.log('  ok   ' + label)
  } else {
    console.log('  FAIL ' + label + (detail ? ' — ' + detail : ''))
    failures.push(label)
  }
}

async function exists(file) {
  try {
    await stat(file)
    return true
  } catch {
    return false
  }
}

async function main() {
  console.log('Extension package')
  const manifestPath = path.join(out, 'manifest.json')
  check('manifest.json exists', await exists(manifestPath))
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  check('manifest is version 3', manifest.manifest_version === 3)
  check('service worker declared', manifest.background?.service_worker === 'background.js')
  check(
    'dashboard page declared',
    manifest.options_ui?.page === 'app/index.html',
    manifest.options_ui?.page,
  )
  check('content script declared', Boolean(manifest.content_scripts?.length))
  check(
    'YouTube handler declared',
    (manifest.content_scripts || []).some(
      (script) =>
        (script.js || []).includes('youtube.js') &&
        (script.matches || []).some((match) => match.includes('youtube.com')),
    ),
  )
  const syntaxError = (file) => {
    try {
      execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' })
      return ''
    } catch (error) {
      return String(error.stderr || error.message || 'could not parse').trim().slice(0, 200)
    }
  }
  check('YouTube handler present', await exists(path.join(out, 'youtube.js')))
  for (const script of ['youtube.js', 'background.js', 'content.js']) {
    const failure = await exists(path.join(out, script))
      ? syntaxError(path.join(out, script))
      : 'missing'
    check(script + ' is valid script', !failure, failure)
  }

  const resources = manifest.declarative_net_request?.rule_resources || []
  const expected = FILTER_LISTS.filter((list) =>
    compileRules(list.rules, list.id).some((rule) => rule.kind === 'network'),
  ).length
  check('a ruleset per list with network rules', resources.length === expected, String(resources.length))

  let totalRules = 0
  for (const resource of resources) {
    const file = path.join(out, resource.path)
    if (!(await exists(file))) {
      check(resource.id + ' ruleset exists', false, resource.path)
      continue
    }
    const rules = JSON.parse(await readFile(file, 'utf8'))
    totalRules += rules.length
    const ids = new Set(rules.map((rule) => rule.id))
    check(
      resource.id + ' ruleset valid (' + rules.length + ' rules)',
      rules.length > 0 && ids.size === rules.length,
    )
    const badTypes = [
      ...new Set(
        rules
          .flatMap((rule) => [
            ...(rule.condition?.resourceTypes || []),
            ...(rule.condition?.excludedResourceTypes || []),
          ])
          .filter((type) => !BROWSER_TYPE_NAMES.has(type)),
      ),
    ]
    check(resource.id + ' uses browser request types', badTypes.length === 0, badTypes.join(', '))
    const leaked = rules
      .map((rule) => rule.condition?.urlFilter || rule.condition?.regexFilter || '')
      .filter((filter) => /\.test(?:\^|\/|\||$)/.test(filter))
    check(resource.id + ' ships no test domains', leaked.length === 0, leaked.join(', '))
  }
  check('network rules generated', totalRules > 50, String(totalRules))

  for (const list of FILTER_LISTS) {
    const css = path.join(out, 'cosmetic', list.id + '.css')
    if (!(await exists(css))) {
      check(list.id + ' hiding stylesheet', false)
      continue
    }
    const text = await readFile(css, 'utf8')
    const selectors = compileRules(list.rules, list.id)
      .filter((rule) => rule.kind === 'cosmetic' && !rule.exception && !rule.domains.length)
      .map((rule) => rule.selector)
    check(
      list.id + ' hiding stylesheet (' + selectors.length + ' selectors)',
      selectors.every((selector) => text.includes(selector + ' {')),
    )
  }

  // Fresh installs read these before the dashboard ever opens.
  const defaultsPath = path.join(out, 'luma-defaults.json')
  if (await exists(defaultsPath)) {
    const defaults = JSON.parse(await readFile(defaultsPath, 'utf8'))
    check(
      'install defaults match the bundled lists',
      JSON.stringify(defaults.lists) === JSON.stringify(DEFAULT_LISTS),
    )
  } else {
    check('install defaults written', false, 'luma-defaults.json')
  }

  const rawRules = new Map()
  const duplicates = []
  for (const list of FILTER_LISTS) {
    for (const line of list.rules) {
      if (!line || line.startsWith('!')) continue
      if (rawRules.has(line)) duplicates.push(line + ' (' + rawRules.get(line) + ', ' + list.id + ')')
      else rawRules.set(line, list.id)
    }
  }
  check('no rule is duplicated across lists', duplicates.length === 0, duplicates.join('; '))

  for (const icon of ['icon16.png', 'icon32.png', 'icon48.png', 'icon128.png']) {
    check(icon + ' present', await exists(path.join(out, 'icons', icon)))
  }
  check('dashboard bundle built', await exists(path.join(out, 'app', 'index.html')))

  console.log('\nFilter decisions')
  const enabled = ['luma-core', 'tracker-shield', 'annoyance-cleaner']
  const rules = FILTER_LISTS.filter((list) => enabled.includes(list.id)).flatMap((list) =>
    compileRules(list.rules, list.id),
  )
  const decide = (url, type, pageHost) =>
    screenRequest({ url, type }, { rules, allowlist: [], protection: true, pageHost })

  const cases = [
    ['blocks a DoubleClick banner', 'https://ad.doubleclick.net/ddm/adi/banner.gif', 'image', 'news.example.com', true],
    ['blocks a Google analytics beacon', 'https://www.google-analytics.com/collect?t=pageview', 'ping', 'news.example.com', true],
    ['blocks a Taboola loader', 'https://cdn.taboola.com/libtrc/network/loader.js', 'script', 'news.example.com', true],
    ['blocks a Facebook pixel', 'https://connect.facebook.net/en_US/fbevents.js', 'script', 'shop.example.com', true],
    ['blocks a pre-roll ad tag', 'https://pubads.g.doubleclick.net/gampad/ads?iu=/1234', 'xmlhttprequest', 'watch.example.com', true],
    ['blocks a YouTube ad ping', 'https://www.youtube.com/api/stats/ads?ver=2', 'xmlhttprequest', 'www.youtube.com', true],
    ['blocks a YouTube midroll request', 'https://www.youtube.com/get_midroll_info?cpn=abc', 'xmlhttprequest', 'www.youtube.com', true],
    ['allows YouTube video playback', 'https://rr3---sn-abc.googlevideo.com/videoplayback?dur=634', 'media', 'www.youtube.com', false],
    ['allows a YouTube page load', 'https://www.youtube.com/watch?v=abc123', 'document', 'www.youtube.com', false],
    ['allows first-party assets', 'https://news.example.com/assets/app.js', 'script', 'news.example.com', false],
    ['allows ordinary images', 'https://news.example.com/img/hero.jpg', 'image', 'news.example.com', false],
  ]
  for (const [label, url, type, pageHost, expected] of cases) {
    const decision = decide(url, type, pageHost)
    check(label, decision.blocked === expected, 'got ' + decision.status)
  }

  const paused = screenRequest(
    { url: 'https://ad.doubleclick.net/ddm/adi/banner.gif', type: 'image' },
    { rules, allowlist: [], protection: false, pageHost: 'news.example.com' },
  )
  check('protection off lets everything through', paused.blocked === false, paused.status)

  const allowlisted = screenRequest(
    { url: 'https://ad.doubleclick.net/ddm/adi/banner.gif', type: 'image' },
    { rules, allowlist: ['news.example.com'], protection: true, pageHost: 'news.example.com' },
  )
  check('allowlisted site is left alone', allowlisted.blocked === false, allowlisted.status)

  const dnr = toDeclarativeNetRequest(rules)
  check(
    'every rule converts to a browser rule',
    dnr.every((rule) => rule.condition && (rule.condition.urlFilter || rule.condition.regexFilter)),
  )

  const documentRule = toDeclarativeNetRequest(compileRules(['@@||example.com^$document'], 'custom'))
  check(
    'adblock request types become browser types',
    documentRule[0]?.condition?.resourceTypes?.[0] === 'main_frame',
    JSON.stringify(documentRule[0]?.condition),
  )
  check(
    'the test-lab exception never ships',
    parseFilter('@@||dailybyte.test^$document').kind === 'network' &&
      !FILTER_LISTS.some((list) => list.rules.some((line) => /\.test/.test(line))),
  )

  console.log('')
  if (failures.length) {
    console.error(failures.length + ' check(s) failed')
    process.exit(1)
  }
  console.log('All checks passed.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
