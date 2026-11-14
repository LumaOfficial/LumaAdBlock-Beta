# Luma

A fast, friendly ad and tracker blocker. Luma ships with a real Adblock Plus
syntax filter engine, a dashboard that tracks what was stopped, a test lab that
runs the engine against simulated sites, a request inspector, and a Manifest V3
browser extension.

## What's inside

| Area | Path | What it does |
| --- | --- | --- |
| Filter engine | `src/lib/engine.js` | Parses `\|\|domain^`, `@@` exceptions, `$third-party,script` options, `/regex/` filters and `##.selector` element hiding, then screens requests |
| Bundled lists | `src/lib/blocklists.js` | Luma Core, Tracker Shield, Annoyance Cleaner, Social Widgets |
| State | `src/lib/store.jsx` | Protection switch, lists, custom rules, allowlist, counters (kept in `localStorage`) |
| Test lab | `src/pages/Lab.jsx` | Four simulated sites; every request and ad slot is checked by the engine |
| Inspector | `src/pages/Inspector.jsx` | Paste a URL, see the rule that decides |
| Extension | `extension/` | The shipped extension: generated rulesets, hiding stylesheets, service worker, content script and the built dashboard |
| Browser bridge | `src/lib/platform.js` | Detects the extension, sends settings to the worker and receives live counters |

## Development

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static build in dist/
```

In the Base44 sandbox the dev server is reached on host port 3000 through the
preview proxy; `vite.config.js` allows the proxy host only when
`BASE44_PREVIEW_MODE=1`.

## Filter syntax supported

```
||ads.example.com^           block a domain (and its subdomains)
@@||ads.example.com^         allow a domain again
|https://cdn.example/x.js    anchor at the start of the URL
/banner\d+/                  regular expression filter
ads.example.com##.sponsored  hide an element on a site
##.cookie-banner             hide an element everywhere
$third-party,script          narrow a rule by request type or party
$domain=a.com|~b.com         narrow by the page the request came from
```

## Building the extension

```bash
npm run build:extension   # rules, hiding stylesheets, manifest, icons and the dashboard
npm run check:extension   # validates the package and the filter decisions
```

`npm run build:extension` writes a loadable extension into `extension/`:

| Path | What it is |
| --- | --- |
| `manifest.json` | Generated from the bundled lists: one `declarative_net_request` ruleset per list |
| `rules/<list>.json` | Network rules compiled by `src/lib/engine.js` |
| `cosmetic/<list>.css` | Element-hiding stylesheet for that list |
| `content.js` | Applies the user's own element-hiding rules as a page style |
| `background.js` | Service worker: enables the chosen rulesets, adds custom and allowlist rules, counts blocks, opens the dashboard |
| `app/` | The dashboard UI, built from `src/` (it renders on the page's hash route) |

Install it with **Developer mode → Load unpacked → `extension/`** (`opera://extensions`,
`chrome://extensions`). The toolbar icon opens the dashboard, which is the same UI
as `npm run dev`. Settings live in the extension's `chrome.storage`, so toggles,
custom rules and the allowlist survive restarts.

Live counters use `declarativeNetRequest.onRuleMatchedDebug`, which browsers only
expose for unpacked/developer installs. In a store-installed build the dashboard
still shows the active rule count but the blocked figures stay at zero (the toolbar
badge keeps counting); drop `declarativeNetRequestFeedback` from the generated
manifest if a store rejects it.

Every counter in the app stays on the device — Luma uploads nothing.
