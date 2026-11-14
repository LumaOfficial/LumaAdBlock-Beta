import { useMemo, useState } from 'react'
import { Trash2, UserCheck } from 'lucide-react'
import { CardHead } from '../ui'
import { useApp } from '../../lib/useApp'

/** Every site you told Luma to stay out of, in one place. */
export default function TrustedSites() {
  const { state, removeAllow } = useApp()
  const [needle, setNeedle] = useState('')

  const rows = useMemo(() => {
    const query = needle.trim().toLowerCase()
    return state.allowlist
      .filter((host) => !query || host.includes(query))
      .sort((a, b) => a.localeCompare(b))
  }, [state.allowlist, needle])

  return (
    <section className="card">
      <CardHead title="Trusted sites" sub="Luma stays out of the way here">
        <span className="badge plain">
          <UserCheck />
          {state.allowlist.length}
        </span>
      </CardHead>

      <div className="field" style={{ marginBottom: 14 }}>
        <label htmlFor="trusted-search">Search</label>
        <input
          id="trusted-search"
          className="input"
          value={needle}
          onChange={(event) => setNeedle(event.target.value)}
          placeholder="news.example.com"
        />
      </div>

      <div className="feed">
        {rows.map((host) => (
          <div className="feed-row" key={host}>
            <div className="feed-main">
              <div className="host">{host}</div>
              <div className="rule">Nothing is blocked or hidden on this site</div>
            </div>
            <div className="feed-side">
              <button type="button" className="btn sm ghost" onClick={() => removeAllow(host)}>
                <Trash2 />
                Stop trusting
              </button>
            </div>
          </div>
        ))}
        {!rows.length ? (
          <div className="empty">
            {state.allowlist.length
              ? 'No trusted site matches that search.'
              : 'No trusted sites yet. Trust one from the dashboard when a site breaks.'}
          </div>
        ) : null}
      </div>

      <p className="footer-note">
        A trusted site is left exactly as it is, ads included. Removing one brings protection back.
      </p>
    </section>
  )
}
