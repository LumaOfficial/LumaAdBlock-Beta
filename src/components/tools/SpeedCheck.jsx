import { useState } from 'react'
import { Timer } from 'lucide-react'
import { CardHead } from '../ui'
import { evaluateRequest } from '../../lib/engine'
import { useApp } from '../../lib/useApp'
import { formatNumber } from '../../lib/format'

const BATCH = 2000

function hostsFrom(rules) {
  const hosts = new Set()
  for (const rule of rules) {
    if (rule.kind !== 'network') continue
    const host = String(rule.pattern || '')
      .replace(/^@@/, '')
      .replace(/^\|\|/, '')
      .replace(/^\|/, '')
      .replace(/\^$/, '')
      .split('/')[0]
    if (/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(host)) hosts.add(host)
  }
  return [...hosts]
}

/** Times the engine against a batch of requests built from your own rules. */
export default function SpeedCheck() {
  const { rules } = useApp()
  const [result, setResult] = useState(null)

  function run() {
    const hosts = hostsFrom(rules)
    const pool = hosts.length ? hosts : ['ad.doubleclick.net']
    const requests = []
    for (let i = 0; i < BATCH; i += 1) {
      requests.push({
        url: `https://${pool[i % pool.length]}/media/${i}.gif`,
        type: i % 3 === 0 ? 'script' : 'image',
      })
    }
    const started = performance.now()
    let blocked = 0
    for (const request of requests) {
      if (evaluateRequest(request, rules, 'example.org').blocked) blocked += 1
    }
    const ms = performance.now() - started
    setResult({
      count: requests.length,
      ms,
      perMicro: (ms * 1000) / requests.length,
      blocked,
      rules: rules.length,
      hosts: hosts.length,
    })
  }

  return (
    <section className="grid-2" style={{ alignItems: 'start' }}>
      <div className="card">
        <CardHead title="Run a speed check" sub="Your rules, a batch of requests" />
        <p className="small muted">
          Luma builds {formatNumber(BATCH)} requests from the addresses your rules cover and asks
          the engine about every one. It runs here in your browser, so nothing is downloaded.
        </p>
        <div className="row" style={{ marginTop: 14 }}>
          <button type="button" className="btn primary" onClick={run}>
            <Timer />
            Start the check
          </button>
        </div>
        <p className="footer-note">Results appear on the right. Nothing is saved or shared.</p>
      </div>

      <div className="card">
        <CardHead title="Results" sub={result ? 'Measured in this browser' : 'Not run yet'} />
        {result ? (
          <div className="stat-grid">
            <div className="stat">
              <div className="stat-label">Whole batch</div>
              <div className="stat-value">
                {result.ms.toFixed(1)}
                <small>ms</small>
              </div>
              <div className="stat-foot">{formatNumber(result.count)} requests</div>
            </div>
            <div className="stat">
              <div className="stat-label">Per request</div>
              <div className="stat-value">
                {result.perMicro.toFixed(1)}
                <small>µs</small>
              </div>
              <div className="stat-foot">time to decide</div>
            </div>
            <div className="stat">
              <div className="stat-label">Rules loaded</div>
              <div className="stat-value">{formatNumber(result.rules)}</div>
              <div className="stat-foot">across {formatNumber(result.hosts)} addresses</div>
            </div>
            <div className="stat">
              <div className="stat-label">Blocked</div>
              <div className="stat-value">{formatNumber(result.blocked)}</div>
              <div className="stat-foot">of {formatNumber(result.count)} sampled</div>
            </div>
          </div>
        ) : (
          <div className="empty">Press start to time your setup.</div>
        )}
      </div>
    </section>
  )
}
