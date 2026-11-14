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
| Accounts | `src/lib/auth.jsx`, `src/lib/api.js`, `server/index.js` | Sign-up (name, date of birth, email, password, phone, state of residence, Terms/Privacy consent) against the account service; one sign-in works on every device; this device keeps only a sign-in token |
| Account service | `server/index.js` | Dependency-free Node service: AES-256-GCM encrypted profiles and synced settings, HMAC email index, scrypt password hashes, hashed session tokens |
| Agreements | `src/lib/legal.js`, `src/components/LegalDialog.jsx` | Terms & Conditions (EULA, Refund Policy) and Privacy Policy shown at sign-up |
| State | `src/lib/store.jsx` | Protection switch, lists, custom rules, allowlist, counters (kept in `localStorage`) |
| Test lab | `src/pages/Lab.jsx` | Four simulated sites; every request and ad slot is checked by the engine |
| Inspector | `src/pages/Inspector.jsx` | Paste a URL and get a plain blocked/allowed verdict |
| Detection | `src/lib/learning.js` | Scores observed requests, adds a host rule for ad-like traffic that slips through, and runs the engine's self-checks |
| Diagnostics | `src/pages/Diagnostics.jsx` | Internal console at `/diagnostics` (never linked in the app): self-checks, detection feed and learned rules |
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
LUMA_API_URL=https://your-api.example.com npm run build:extension   # rules, hiding stylesheets, manifest, icons and the dashboard
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

Live counters work in every install. Unpacked installs get a per-request feed
(`onRuleMatchedDebug`); store installs read the browser's matched-rule history with
`getMatchedRules` (throttled to the browser's call limit) and the toolbar badge keeps
its own count. Both need the `declarativeNetRequestFeedback` permission.

## Account service

`server/index.js` stores accounts and syncs protection settings. It needs one secret,
`ACCOUNT_ENCRYPTION_KEY` (keep it safe: losing it makes stored accounts unreadable),
plus a persistent `DATA_DIR`. Run it with `node server/index.js` (Node 22+) behind HTTPS
and pass its address to the extension build with `LUMA_API_URL`. In the sandbox it runs
on port 8000 and the dev server points at it through `VITE_API_URL`.
