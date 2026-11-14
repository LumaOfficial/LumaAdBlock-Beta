import { useState } from 'react'
import { Play } from 'lucide-react'
import { screenRequest } from '../../lib/engine'
import { buildSprintRequests } from '../../lib/experiments'
import { formatNumber } from '../../lib/format'
import { useApp } from '../../lib/useApp'

const REQUESTS = 1200

/**
 * An internet-speed style test for the filter engine: real addresses taken
 * from the lists the person enabled, screened in a single timed pass.
 */
export default function RulesetSprint({ onResult }) {
  const { rules, state } = useApp()
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState(null)

  function run() {
    if (running) return
    const requests = buildSprintRequests(rules, REQUESTS)
    if (!requests.length) {
      setResult({ error: 'Turn on at least one filter list in Protection, then run again.' })
      return
    }

    setRunning(true)
    setResult(null)
    // Let the button paint before the timed loop takes the main thread.
    window.setTimeout(() => {
      const started = performance.now()
      let blocked = 0
      for (const request of requests) {
        const decision = screenRequest(request, {
          rules,
          allowlist: state.allowlist,
          protection: true,
          pageHost: 'speed.luma.test',
        })
        if (decision.blocked) blocked += 1
      }
      const elapsed = performance.now() - started
      const perSecond = Math.round(requests.length / (elapsed / 1000))
      const micros = (elapsed * 1000) / requests.length
      setRunning(false)
      setResult({
        requests: requests.length,
        elapsed: Math.round(elapsed),
        perSecond,
        micros: Math.round(micros * 10) / 10,
        blocked,
      })
      onResult?.({ value: perSecond, unit: 'req/s', label: 'Requests per second' })
    }, 80)
  }

  return (
    <div className="experiment-body">
      <div className="experiment-side">
        <p className="small muted">
          {formatNumber(REQUESTS)} real addresses from your enabled lists, screened once as fast as
          this browser can.
        </p>
        <button type="button" className="btn primary" onClick={run} disabled={running}>
          <Play />
          {running ? 'Screening…' : result ? 'Run again' : 'Start the sprint'}
        </button>
        {result?.error ? <p className="hint">{result.error}</p> : null}
      </div>

      {result && !result.error ? (
        <div className="experiment-metrics">
          <div>
            <strong>{formatNumber(result.perSecond)}</strong>
            <span>requests per second</span>
          </div>
          <div>
            <strong>{result.micros} µs</strong>
            <span>per request</span>
          </div>
          <div>
            <strong>{formatNumber(result.elapsed)} ms</strong>
            <span>total time</span>
          </div>
          <div>
            <strong>{formatNumber(result.blocked)}</strong>
            <span>blocked</span>
          </div>
        </div>
      ) : (
        <div className="sprint-track" data-running={running ? 'true' : 'false'}>
          <span />
          <p>{running ? 'Screening requests…' : 'Ready when you are.'}</p>
        </div>
      )}
    </div>
  )
}
