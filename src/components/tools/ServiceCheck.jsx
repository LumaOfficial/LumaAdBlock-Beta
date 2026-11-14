import { CheckCircle2, Plus, ShieldX, Trash2 } from 'lucide-react'
import { CardHead } from '../ui'
import { screenRequest } from '../../lib/engine'
import { useApp } from '../../lib/useApp'

/**
 * One service, checked against the protection a person has actually turned on.
 * If it still gets through, they can stop the whole service in one tap.
 */
export default function ServiceCheck({ service }) {
  const { rules, state, protectionNow, addCustomRule, removeCustomRule } = useApp()
  const rule = '||' + service.domain + '^'
  const added = state.customRules.includes(rule)

  const checks = service.paths.map((path) => {
    const url = `https://${service.domain}${path}`
    const decision = screenRequest(
      { url, type: service.type },
      { rules, allowlist: state.allowlist, protection: protectionNow, pageHost: 'news.dailybyte.test' },
    )
    return { url, status: decision.status, listId: decision.listId }
  })

  const stopped = checks.filter((check) => check.status === 'blocked').length
  const verdict = !protectionNow
    ? 'Protection is paused'
    : stopped === checks.length
      ? 'Blocked'
      : stopped
        ? 'Partly blocked'
        : 'Getting through'

  return (
    <section className="grid-2" style={{ alignItems: 'start' }}>
      <div className="card">
        <CardHead title={service.label} sub={service.domain}>
          <span className="badge plain">{verdict}</span>
        </CardHead>
        <p className="small muted">{service.blurb}</p>

        <div className="note" style={{ marginTop: 14 }}>
          <span className="eyebrow">What Luma does with it</span>
          <div className="stack" style={{ gap: 10, marginTop: 8 }}>
            {checks.map((check) => (
              <div key={check.url} className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
                <span className="small mono muted" style={{ wordBreak: 'break-all' }}>
                  {check.url}
                </span>
                <span className="badge plain">{check.status === 'blocked' ? 'stopped' : check.status}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="hint" style={{ marginTop: 12 }}>
          {protectionNow
            ? 'Checked against the lists and rules switched on right now.'
            : 'Turn protection back on to see what would be stopped.'}
        </p>
      </div>

      <div className="stack">
        <div className="decision" data-status={stopped ? 'blocked' : 'allowed'}>
          <div className="decision-head">
            <span className="decision-icon">
              {stopped ? <ShieldX /> : <CheckCircle2 />}
            </span>
            <div>
              <h3>{stopped ? 'Luma stops it' : 'Luma lets it past'}</h3>
              <p>
                {stopped
                  ? `${stopped} of ${checks.length} ${service.label} requests never leave your browser.`
                  : `${service.label} is not covered by the lists you have on.`}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <CardHead
            title={added ? 'This service is blocked' : 'Block the whole service'}
            sub={added ? 'Added to your own rules' : 'Adds one rule for ' + service.domain}
          />
          {added ? (
            <button type="button" className="btn ghost" onClick={() => removeCustomRule(rule)}>
              <Trash2 />
              Remove
            </button>
          ) : (
            <button type="button" className="btn" onClick={() => addCustomRule(rule)}>
              <Plus />
              Stop {service.label}
            </button>
          )}
          <p className="footer-note" style={{ marginTop: 12 }}>
            Your rules stay on this device and apply on every site you visit.
          </p>
        </div>
      </div>
    </section>
  )
}
