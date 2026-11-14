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
| Extension | `extension/` | MV3 manifest, declarative rules, element hiding CSS |

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

## Installing the extension

The install walkthrough is not part of the public app. The exported rule set lives
in `extension/`:

1. Regenerate `extension/rules.json` from the enabled lists with `toDeclarativeNetRequest`.
2. Visit `chrome://extensions` (or `opera://extensions`), enable **Developer mode**,
   choose **Load unpacked** and select the `extension/` folder.

Every counter in the app stays on the device — Luma uploads nothing.
