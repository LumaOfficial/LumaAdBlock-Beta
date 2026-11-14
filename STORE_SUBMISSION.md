# Store submission — Luma Ad Blocker 1.0.3

Everything in this file is ready to paste into the Opera Add-ons submission form.
Screenshots and the listing summary are the only parts you write yourself.

## 1. The upload

```bash
npm run build:extension     # rebuild extension/ from src/ (unminified on purpose)
npm run check:extension     # validates the manifest, rulesets and filter decisions
npm run package:extension   # writes release/luma-ad-blocker-1.0.3.zip
```

Upload `release/luma-ad-blocker-1.0.3.zip`. The archive has `manifest.json` at its root
(no wrapping folder) and contains no source maps, tests, sample pages or development
files. The version in the manifest is read from `package.json`, and the packaging
script refuses to run when the two disagree.

The package is self-contained: it blocks ads on install, the toolbar icon opens the
panel, and the full dashboard opens from there. Accounts are optional — when the build
has no `LUMA_API_URL`, everything runs on the device and the account page says so.

## 2. Single purpose (required field)

> Luma blocks advertisements, trackers and unwanted page elements while you browse.

## 3. Permission justifications (required field)

| Permission | Justification |
| --- | --- |
| `host_permissions: <all_urls>` | Ads and trackers appear on every site; the filter lists decide which requests and elements are blocked on each one. |
| `declarativeNetRequest` | The core feature. Blocks matching network requests through the browser's own rule engine, using four rulesets compiled from the bundled filter lists. |
| `storage` | Saves the protection switch, enabled lists, custom rules, trusted sites and counters on the device. |
| `scripting` | Registers the element-hiding stylesheets for the filter lists the person enables, and skips sites they trust. |
| `alarms` | Re-applies the quiet-hours schedule once a minute while the dashboard is closed. |
| Remote code | None. All scripts are inside the package; nothing is fetched and executed at runtime. |

## 4. Data practices answers

- Does the extension collect browsing history? **No.**
- Does it collect or transmit page content, form data, passwords or messages? **No.**
- Are blocked counts sent anywhere? **No — they are stored locally.**
- Is any data sold? **No.**
- Account data (only when an account is created): name, date of birth, email, password,
  phone, state of residence, protection settings. Encrypted at rest; HTTPS in transit.
- Privacy policy URL: host `PRIVACY.md` at a public HTTPS address and paste that URL in
  the form. The same text is shown inside the app.

## 5. Listing copy

**Name** — Luma Ad Blocker

**Summary (132 characters max)**
> A fast, friendly ad and tracker blocker. Less noise, fewer cookies, no browsing history collected.

**Detailed description**

> Luma quiets the web. It blocks ads, trackers, cookie banners and other annoying page
> elements before they load, so pages open faster and use less data.
>
> • Blocks ads and trackers on every site you visit
> • Hides cookie notices, newsletter pop-ups and floating widgets
> • Skips and hides YouTube ads without stopping playback
> • One switch in the toolbar panel, with a per-page count of what was stopped
> • Choose which filter categories run, trust sites you want left alone, and set quiet
>   hours when protection pauses
> • Everything is processed on your device. No browsing history is collected and
>   nothing is sold.
>
> Luma is in beta: some sites may need a moment to look right. Trust a site from the
> dashboard and it is left untouched.

**Category** — Privacy & Security

## 6. Screenshots

Opera asks for at least one; 1280×800 or 640×400 PNG/JPG. Suggested set:

1. Toolbar panel with the protection switch on.
2. Dashboard overview with the blocked counter.
3. Protection settings with the filter list toggles.
4. Activity list showing what was stopped.

Take them by loading the unpacked `extension/` folder from a normal-size browser
window and using the panel and dashboard as a person would.

## 7. Review notes (optional field)

> Luma blocks requests through declarativeNetRequest rulesets compiled from the bundled
> filter lists. The toolbar icon opens a compact panel; the full dashboard opens from
> it. No account is needed. No remote code is loaded. The source is unminified so it can
> be read.

## 8. Checklist before uploading

- [x] Manifest V3, version `1.0.3`, matching `package.json`
- [x] `npm run check:extension` passes
- [x] Package has `manifest.json` at its root, no maps or test files
- [x] Icons 16/32/48/128 included and transparent
- [x] No hardcoded development, sandbox or preview addresses
- [x] No account service required for the extension to work
- [ ] Privacy policy hosted at a public HTTPS URL (host `PRIVACY.md`)
- [ ] Screenshots taken and listing copy pasted
- [ ] Developer account and payout/tax details set up in the store console
