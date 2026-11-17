import { useState } from 'react'
import { Globe, PauseCircle, Plus, ShieldCheck, Undo2, X } from 'lucide-react'
import { CardHead } from '../ui'
import PausedSites from './PausedSites'
import { useApp, useTopDomains } from '../../lib/useApp'
import { hostnameOf, siteOf } from '../../lib/engine'
import { formatCompact } from '../../lib/format'

/** Let a blocked domain through, the same way an exception rule would. */
function allowRule(host) {
  return '@@||' + host + '^'
}

export default function SiteControls() {
  const { state, addAllow, removeAllow, addCustomRule, removeCustomRule, setSitePaused } = useApp()
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const domains = useTopDomains(5)
  const topMax = domains.length ? domains[0].count : 1

  /** The address in the box, as a site, or an empty string and a message. */
  function siteInDraft() {
    const host = siteOf(hostnameOf(draft))
    if (!host || !host.includes('.')) {
      setError('That does not look like a website address.')
      return ''
    }
    return host
  }

  function submit(event) {
    event.preventDefault()
    const host = siteInDraft()
    if (!host) return
    if (state.allowlist.includes(host)) {
      setError(host + ' is already trusted.')
      return
    }
    addAllow(host)
    setDraft('')
    setError('')
  }

  /** Stop filtering one site, leaving every other site as it is. */
  function pause() {
    const host = siteInDraft()
    if (!host) return
    setSitePaused(host, true)
    setDraft('')
    setError('')
  }

  return (
    <div className="card">
      <CardHead
        title="Sites you control"
        sub="Trust one site, pause one site, or let a blocked domain through"
      />

      <form className="inline-form" onSubmit={submit}>
        <div className="field grow">
          <label htmlFor="trust-site">Site address</label>
          <input
            id="trust-site"
            className="input"
            placeholder="news.example.com"
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value)
              setError('')
            }}
          />
        </div>
        <button className="btn primary" type="submit">
          <Plus />
          Trust
        </button>
        <button className="btn" type="button" onClick={pause}>
          <PauseCircle />
          Pause
        </button>
      </form>
      {error ? (
        <p className="hint" style={{ color: 'var(--accent-deep)', marginTop: 8 }}>
          {error}
        </p>
      ) : null}

      <div className="chips" style={{ marginTop: 12 }}>
        {state.allowlist.map((host) => (
          <span className="chip" key={host}>
            <Globe width={12} height={12} />
            {host}
            <button type="button" aria-label={'Stop trusting ' + host} onClick={() => removeAllow(host)}>
              <X />
            </button>
          </span>
        ))}
        {!state.allowlist.length ? (
          <div className="empty">No trusted sites yet. Everything is filtered.</div>
        ) : null}
      </div>

      <PausedSites />

      <div className="site-list" style={{ marginTop: 14 }}>
        <div className="mini-label">Top blocked domains</div>
        {domains.map((domain) => {
          const rule = allowRule(domain.host)
          const allowed = state.customRules.includes(rule)
          return (
            <div className="site-row" key={domain.host}>
              <div>
                <div className="domain-name">{domain.host}</div>
                <div className="domain-track">
                  <div
                    className="domain-fill"
                    style={{ width: Math.max(4, (domain.count / topMax) * 100) + '%' }}
                  />
                </div>
              </div>
              <span className="domain-count">{formatCompact(domain.count)}</span>
              {allowed ? (
                <button
                  type="button"
                  className="btn sm ghost"
                  onClick={() => removeCustomRule(rule)}
                  title={'Block ' + domain.host + ' again'}
                >
                  <ShieldCheck width={13} height={13} />
                  Allowed
                </button>
              ) : (
                <button
                  type="button"
                  className="btn sm ghost"
                  onClick={() => addCustomRule(rule)}
                  title={'Always allow ' + domain.host}
                >
                  <Undo2 width={13} height={13} />
                  Allow
                </button>
              )}
            </div>
          )
        })}
        {!domains.length ? (
          <div className="empty">
            Nothing blocked on this device yet, so there is nothing to allow.
          </div>
        ) : null}
      </div>

      <p className="footer-note">
        A trusted site is left alone completely. A paused site keeps its place in the lists and
        stops being filtered until you resume it. Allowing a domain only stops Luma from blocking
        that one domain everywhere.
      </p>
    </div>
  )
}
