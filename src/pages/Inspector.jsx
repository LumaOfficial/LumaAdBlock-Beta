import { useState } from 'react'
import { AlertTriangle, CheckCircle2, PauseCircle, Search, ShieldCheck, ShieldX } from 'lucide-react'
import { CardHead, PageHead } from '../components/ui'
import { hostnameOf, isThirdParty, screenRequest } from '../lib/engine'
import { useApp } from '../lib/store'
import { formatNumber } from '../lib/format'
import { ListBadge } from '../components/Layout'

const EXAMPLES = [
  {
    label: 'DoubleClick banner',
    url: 'https://ad.doubleclick.net/ddm/adi/N4821/banner.gif',
    type: 'image',
    pageHost: 'news.dailybyte.test',
  },
  {
    label: 'Analytics beacon',
    url: 'https://www.google-analytics.com/collect?v=1&t=pageview',
    type: 'ping',
    pageHost: 'news.dailybyte.test',
  },
  {
    label: 'First-party script',
    url: 'https://news.dailybyte.test/assets/app.js',
    type: 'script',
    pageHost: 'news.dailybyte.test',
  },
  {
    label: 'Custom rule',
    url: 'https://ads.partner-feed.test/pixel.gif',
    type: 'image',
    pageHost: 'example.org',
  },
  {
    label: 'Allowlisted site',
    url: 'https://ad.doubleclick.net/ddm/adi/N4821/banner.gif',
    type: 'image',
    pageHost: 'bank.example',
  },
]

const TYPES = ['script', 'image', 'stylesheet', 'xmlhttprequest', 'subdocument', 'document', 'media', 'font', 'ping', 'other']

export default function Inspector() {
  const { rules, state, networkRuleCount } = useApp()
  const [url, setUrl] = useState(EXAMPLES[0].url)
  const [type, setType] = useState(EXAMPLES[0].type)
  const [pageHost, setPageHost] = useState(EXAMPLES[0].pageHost)

  const requestHost = hostnameOf(url)
  const third = isThirdParty(pageHost, requestHost)
  const decision = screenRequest(
    { url, type },
    { rules, allowlist: state.allowlist, protection: state.protection, pageHost },
  )

  const status = decision.status
  const titles = {
    blocked: 'Blocked',
    allowed: 'Allowed',
    allowlisted: 'Allowed — site is allowlisted',
    paused: 'Allowed — protection is paused',
  }

  return (
    <>
      <PageHead
        eyebrow="Inspector"
        title="Why was that blocked?"
        lede="Paste any request and Luma will run it through the exact rule set in your browser, then show you the rule that decided."
      >
        <span className="badge plain">
          <ShieldCheck />
          {formatNumber(networkRuleCount)} network rules loaded
        </span>
      </PageHead>

      <section className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <CardHead title="Request" sub="Nothing leaves your device" />
          <div className="stack" style={{ gap: 14 }}>
            <div className="field">
              <label htmlFor="url">Request URL</label>
              <input
                id="url"
                className="input mono"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                spellCheck="false"
                placeholder="https://ads.example.com/banner.js"
              />
            </div>
            <div className="row" style={{ alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
              <div className="field grow" style={{ minWidth: 180 }}>
                <label htmlFor="page">Page you are on</label>
                <input
                  id="page"
                  className="input mono"
                  value={pageHost}
                  onChange={(event) => setPageHost(event.target.value)}
                  spellCheck="false"
                  placeholder="example.com"
                />
              </div>
              <div className="field" style={{ minWidth: 150 }}>
                <label htmlFor="type">Resource type</label>
                <select id="type" className="select" value={type} onChange={(event) => setType(event.target.value)}>
                  {TYPES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {!requestHost ? (
              <p className="hint" style={{ color: 'var(--accent-deep)' }}>
                That does not look like a URL yet — try something like https://ads.example.com/banner.js
              </p>
            ) : null}
            <div>
              <div className="eyebrow" style={{ marginBottom: 8 }}>
                Try an example
              </div>
              <div className="example-chips">
                {EXAMPLES.map((example) => (
                  <button
                    key={example.label}
                    type="button"
                    className="example"
                    onClick={() => {
                      setUrl(example.url)
                      setType(example.type)
                      setPageHost(example.pageHost)
                    }}
                  >
                    {example.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="note" style={{ marginTop: 16 }}>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <span className="badge plain">host: {requestHost || '—'}</span>
              <span className="badge plain">
                {third === undefined ? 'party: unknown' : third ? 'third-party' : 'first-party'}
              </span>
              <span className="badge plain">type: {type}</span>
            </div>
          </div>
        </div>

        <div className="stack">
          <div className="decision" data-status={status}>
            <div className="decision-head">
              <span className="decision-icon">
                {status === 'blocked' ? (
                  <ShieldX />
                ) : status === 'paused' ? (
                  <PauseCircle />
                ) : (
                  <CheckCircle2 />
                )}
              </span>
              <div>
                <h3>{titles[status]}</h3>
                <p>{decision.reason}</p>
              </div>
            </div>

            {decision.rule ? (
              <div className="match-list">
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span className="eyebrow">Deciding rule</span>
                  <ListBadge listId={decision.rule.listId} />
                </div>
                <div className="match">
                  <code>{decision.rule.raw}</code>
                  <span className={'badge ' + (decision.rule.exception ? 'good' : 'accent')}>
                    {decision.rule.exception ? 'allow' : 'block'}
                  </span>
                </div>
                {decision.matches.length > 1 ? (
                  <p className="small muted">
                    {decision.matches.length - 1} more rule
                    {decision.matches.length - 1 === 1 ? '' : 's'} matched as well.
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="match-list">
                <div className="eyebrow">No rule matched</div>
                <p className="small muted" style={{ marginTop: 6 }}>
                  This request is not on any of your enabled lists, so Luma lets it through.
                </p>
              </div>
            )}
          </div>

          {decision.matches.length ? (
            <div className="card" style={{ padding: 18 }}>
              <CardHead title="All matching rules" sub={`${decision.matches.length} rule(s) hit this request`} />
              <div className="stack" style={{ gap: 8 }}>
                {decision.matches.map((rule) => (
                  <div className="rule-row" key={rule.listId + rule.raw}>
                    <span className={'badge ' + (rule.exception ? 'good' : 'plain')}>
                      {rule.exception ? 'allow' : 'block'}
                    </span>
                    <code>{rule.raw}</code>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: 18 }}>
              <div className="row">
                <AlertTriangle width={16} height={16} style={{ color: 'var(--warn)' }} />
                <span className="small muted">
                  Exceptions always win over block rules. Add <span className="mono">@@||host^</span> in Filter
                  lists to let a whole domain through.
                </span>
              </div>
            </div>
          )}

          <p className="footer-note">
            <Search size={12} style={{ verticalAlign: '-2px', marginRight: 4 }} />
            Decisions use the lists you have enabled plus your custom rules.
          </p>
        </div>
      </section>
    </>
  )
}
