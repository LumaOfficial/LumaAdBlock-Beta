import { Activity, CheckCircle2, RefreshCw, ShieldQuestion, Trash2, XCircle } from 'lucide-react'
import { CardHead, PageHead } from '../components/ui'
import { useApp } from '../lib/store'
import { formatNumber, relativeTime } from '../lib/format'

function lastScanLabel(lastScan) {
  if (!lastScan) return 'not run yet'
  return relativeTime(new Date(lastScan).toISOString())
}

export default function Diagnostics() {
  const { state, rules, networkRuleCount, cosmeticRuleCount, clearLearned } = useApp()
  const health = state.health
  const observations = state.observations
  const passed = health ? health.checks.filter((check) => check.ok).length : 0

  return (
    <>
      <PageHead
        eyebrow="Internal — not linked from the app"
        title="Detection console"
        lede="Continuous self-checks and the patterns Luma learns from observed requests. Everything on this page is computed in the browser and never uploaded."
      />

      <section className="stat-grid">
        <div className="stat">
          <div className="stat-label">
            <RefreshCw />
            Scans run
          </div>
          <div className="stat-value">{formatNumber(state.scans)}</div>
          <div className="stat-foot">Last scan {lastScanLabel(state.lastScan)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">
            <ShieldQuestion />
            Self-checks
          </div>
          <div className="stat-value">
            {health ? `${passed}/${health.checks.length}` : '—'}
          </div>
          <div className="stat-foot">
            {health ? (health.ok ? 'Engine healthy' : 'Issues found') : 'Waiting for the first scan'}
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">
            <Activity />
            Observed requests
          </div>
          <div className="stat-value">{formatNumber(observations.length)}</div>
          <div className="stat-foot">
            {formatNumber(state.learned.length)} pattern{state.learned.length === 1 ? '' : 's'} learned
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">
            <CheckCircle2 />
            Rules in play
          </div>
          <div className="stat-value">{formatNumber(networkRuleCount)}</div>
          <div className="stat-foot">
            {formatNumber(cosmeticRuleCount)} hiding · {formatNumber(rules.length)} compiled
          </div>
        </div>
      </section>

      <section className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <CardHead title="Self-checks" sub="Re-run every ten seconds against the live rule set" />
          {health ? (
            <div className="check-list">
              {health.checks.map((check) => (
                <div className="check" data-ok={check.ok ? 'true' : 'false'} key={check.id}>
                  {check.ok ? <CheckCircle2 /> : <XCircle />}
                  <span className="grow">
                    <span style={{ fontWeight: 500 }}>{check.label}</span>
                    <br />
                    <span className="small muted">{check.detail}</span>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">Waiting for the first scan.</div>
          )}
        </div>

        <div className="card">
          <CardHead title="Detection feed" sub="Requests the engine saw, newest first" />
          <div className="request-table">
            {observations.slice(0, 24).map((item) => (
              <div
                className="request-row"
                key={item.id}
                data-status={item.blocked ? 'blocked' : 'allowed'}
              >
                <div className="req-main">
                  <div className="req-label">{item.host || item.url}</div>
                  <div className="req-url" title={item.url}>
                    {item.url}
                  </div>
                </div>
                <span className={'req-state ' + (item.blocked ? 'blocked' : 'allowed')}>
                  {item.blocked ? 'blocked' : 'allowed'}
                </span>
              </div>
            ))}
            {!observations.length ? (
              <div className="empty">
                Nothing observed yet. Open the test lab or the inspector and Luma starts watching.
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <CardHead
          title="Learned patterns"
          sub="Requests that looked like ads once slipped through; these rules now stop them"
        >
          <button
            type="button"
            className="btn sm ghost"
            onClick={clearLearned}
            disabled={!state.learned.length}
          >
            <Trash2 />
            Reset learned
          </button>
        </CardHead>
        <div className="stack" style={{ gap: 8 }}>
          {state.learned.map((item) => (
            <div className="rule-row" key={item.rule}>
              <span className="badge accent">learned</span>
              <code>{item.rule}</code>
              <span className="small muted grow">{item.reason}</span>
              <span className="small muted">{relativeTime(item.at)}</span>
            </div>
          ))}
          {!state.learned.length ? (
            <div className="empty">
              No patterns learned yet. When a request gets past every rule and still looks like an ad,
              Luma writes a rule for its host automatically.
            </div>
          ) : null}
        </div>
      </section>
    </>
  )
}
