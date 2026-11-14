import { useState } from 'react'
import { ArrowDownToLine, Chrome, Code2, ExternalLink, ShieldCheck } from 'lucide-react'
import { PageHead, CardHead } from '../components/ui'
import { useApp } from '../lib/store'
import { toDeclarativeNetRequest } from '../lib/engine'
import { formatNumber } from '../lib/format'

const MANIFEST = `{
  "manifest_version": 3,
  "name": "Luma Ad Blocker",
  "version": "0.1.0",
  "permissions": ["declarativeNetRequest", "storage"],
  "host_permissions": ["<all_urls>"],
  "declarative_net_request": {
    "rule_resources": [
      { "id": "luma", "enabled": true, "path": "rules.json" }
    ]
  },
  "content_scripts": [
    { "matches": ["<all_urls>"], "css": ["cosmetic.css"], "run_at": "document_start" }
  ]
}`

export default function Extension() {
  const { rules, networkRuleCount, cosmeticRuleCount } = useApp()
  const [exported, setExported] = useState(0)

  function download() {
    const payload = toDeclarativeNetRequest(rules)
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'luma-rules.json'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    setExported(payload.length)
  }

  return (
    <>
      <PageHead
        eyebrow="Get the app"
        title="Block ads everywhere."
        lede="Luma ships as a Manifest V3 extension. Export the rules you have enabled here and load them into Chrome, Edge or Brave in a minute."
      >
        <button className="btn primary" type="button" onClick={download}>
          <ArrowDownToLine />
          Export rules.json
        </button>
      </PageHead>

      <section className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <CardHead title="Install in Chrome" sub="Developer mode, no store account needed" />
          <div className="steps">
            <div className="step">
              <span className="step-num">1</span>
              <div>
                <h3>Export your rules</h3>
                <p>
                  Press <strong>Export rules.json</strong> and save the file into the{' '}
                  <span className="mono">extension/</span> folder of this project, replacing the sample.
                </p>
              </div>
            </div>
            <div className="step">
              <span className="step-num">2</span>
              <div>
                <h3>Open the extensions page</h3>
                <p>
                  Go to <span className="mono">chrome://extensions</span> and switch on{' '}
                  <strong>Developer mode</strong> in the top right corner.
                </p>
              </div>
            </div>
            <div className="step">
              <span className="step-num">3</span>
              <div>
                <h3>Load the folder</h3>
                <p>
                  Choose <strong>Load unpacked</strong> and select the{' '}
                  <span className="mono">extension/</span> folder. Luma appears in your toolbar.
                </p>
              </div>
            </div>
            <div className="step">
              <span className="step-num">4</span>
              <div>
                <h3>Browse quietly</h3>
                <p>
                  Declarative rules block requests before they leave the browser; the stylesheet hides
                  leftover ad slots and cookie walls.
                </p>
              </div>
            </div>
          </div>

          <div className="row" style={{ marginTop: 16, flexWrap: 'wrap' }}>
            <a
              className="btn"
              href="https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest"
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink />
              Rule reference
            </a>
            <span className="badge plain">
              <ShieldCheck />
              {formatNumber(networkRuleCount)} network · {formatNumber(cosmeticRuleCount)} hiding rules ready
            </span>
          </div>
          {exported ? (
            <p className="hint" style={{ marginTop: 10 }}>
              Exported {formatNumber(exported)} declarative rules to luma-rules.json.
            </p>
          ) : null}
        </div>

        <div className="stack">
          <div className="card">
            <CardHead title="What ships" sub="Three small files and a stylesheet" />
            <div className="stack" style={{ gap: 8 }}>
              <div className="rule-row">
                <span className="badge plain">manifest</span>
                <code>extension/manifest.json</code>
              </div>
              <div className="rule-row">
                <span className="badge plain">rules</span>
                <code>extension/rules.json</code>
              </div>
              <div className="rule-row">
                <span className="badge plain">hiding</span>
                <code>extension/cosmetic.css</code>
              </div>
              <div className="rule-row">
                <span className="badge plain">service</span>
                <code>extension/background.js</code>
              </div>
            </div>
            <p className="footer-note" style={{ marginTop: 10 }}>
              <Chrome size={12} style={{ verticalAlign: '-2px', marginRight: 4 }} />
              Firefox uses the same manifest with a small browser_specific_settings block; Safari needs
              Apple&rsquo;s converter.
            </p>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="row" style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
              <Code2 width={15} height={15} />
              <span style={{ fontWeight: 600, fontSize: 13 }}>manifest.json</span>
            </div>
            <div className="code-panel" style={{ borderRadius: 0 }}>
              {MANIFEST}
            </div>
          </div>
        </div>
      </section>

      <section className="card">
        <CardHead title="How blocking works" sub="From your lists to the browser's network stack" />
        <div className="grid-3">
          <div>
            <div className="eyebrow">1 · Compile</div>
            <p className="small muted" style={{ marginTop: 6 }}>
              Filter syntax is parsed once into patterns, options and cosmetic selectors. Errors never
              reach the browser.
            </p>
          </div>
          <div>
            <div className="eyebrow">2 · Screen</div>
            <p className="small muted" style={{ marginTop: 6 }}>
              Every request is checked for exceptions, then block rules, with third-party and resource
              type options applied.
            </p>
          </div>
          <div>
            <div className="eyebrow">3 · Hide</div>
            <p className="small muted" style={{ marginTop: 6 }}>
              Element hiding rules remove the empty slots that are left behind, so pages keep their
              shape.
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
