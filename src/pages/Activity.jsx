import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, EyeOff, FlaskConical, ShieldCheck, Undo2, UserX, Zap } from 'lucide-react'
import { CardHead, PageHead, useToast } from '../components/ui'
import { useApp, useBlockedToday } from '../lib/useApp'
import { dayKey } from '../lib/dates'
import { formatNumber, percent, relativeTime } from '../lib/format'

const FILTERS = [
  { id: 'all', label: 'Everything' },
  { id: 'blocked', label: 'Stopped' },
  { id: 'allowed', label: 'Allowed' },
]

/**
 * One log out of two sources: the blocks the extension reported, plus the
 * requests the engine screened here (the test lab records those), newest first.
 */
function logRows(state) {
  const rows = []
  const seen = new Set()
  for (const event of state.activity) {
    if (!event?.host || seen.has(event.id)) continue
    seen.add(event.id)
    rows.push({ id: event.id, host: event.host, at: event.at, blocked: true })
  }
  for (const item of state.observations) {
    if (!item?.host || seen.has(item.id)) continue
    seen.add(item.id)
    rows.push({ id: item.id, host: item.host, at: item.at, blocked: Boolean(item.blocked) })
  }
  return rows.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 200)
}

/** The visible log as a spreadsheet-ready file, built in this tab only. */
function saveLog(rows) {
  const lines = ['when,site,outcome']
  for (const row of rows) {
    const when = new Date(row.at)
    const stamp = Number.isFinite(when.getTime()) ? when.toISOString() : ''
    lines.push([stamp, row.host, row.blocked ? 'stopped' : 'allowed'].join(','))
  }
  const blob = new Blob([lines.join('\n') + '\n'], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'luma-activity-' + dayKey() + '.csv'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export default function Activity() {
  const { state, addCustomRule } = useApp()
  const blockedToday = useBlockedToday()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const toast = useToast()
  const rows = useMemo(() => logRows(state), [state])

  const stopped = rows.filter((row) => row.blocked).length
  const allowed = rows.length - stopped
  const needle = query.trim().toLowerCase()
  const visible = rows
    .filter((row) => (filter === 'all' ? true : filter === 'blocked' ? row.blocked : !row.blocked))
    .filter((row) => (needle ? row.host.toLowerCase().includes(needle) : true))
  const blockedShare = percent(state.totals.blocked, state.totals.screened)

  return (
    <>
      <PageHead
        eyebrow="Activity"
        title="Every request Luma saw."
        lede="A running log of what the engine screened on this device, newest first."
      >
        <span className="badge plain">
          <EyeOff />
          {formatNumber(rows.length)} logged
        </span>
      </PageHead>

      <section className="stat-grid">
        <div className="stat">
          <div className="stat-label">
            <EyeOff />
            Stopped today
          </div>
          <div className="stat-value">{formatNumber(blockedToday)}</div>
          <div className="stat-foot">Since midnight</div>
        </div>
        <div className="stat">
          <div className="stat-label">
            <ShieldCheck />
            Stopped all time
          </div>
          <div className="stat-value">{formatNumber(state.totals.blocked)}</div>
          <div className="stat-foot">Across every site</div>
        </div>
        <div className="stat">
          <div className="stat-label">
            <UserX />
            Trackers stopped
          </div>
          <div className="stat-value">{formatNumber(state.totals.trackers)}</div>
          <div className="stat-foot">Pixels, beacons and analytics</div>
        </div>
        <div className="stat">
          <div className="stat-label">
            <Zap />
            Requests screened
          </div>
          <div className="stat-value">{formatNumber(state.totals.screened)}</div>
          <div className="stat-foot">{blockedShare}% blocked</div>
        </div>
      </section>

      <section className="card">
        <CardHead title="Request log" sub="The last 200 entries, newest first">
          <button
            type="button"
            className="btn sm ghost"
            disabled={!visible.length}
            onClick={() => {
              saveLog(visible)
              toast.show('Log saved to this device')
            }}
          >
            <Download />
            Save log
          </button>
        </CardHead>

        <div className="inline-form" style={{ marginBottom: 4 }}>
          <div className="field">
            <label htmlFor="activity-filter">Filter by site</label>
            <input
              id="activity-filter"
              className="input"
              value={query}
              placeholder="news.example"
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="seg" role="group" aria-label="Show">
            {FILTERS.map((option) => (
              <button
                key={option.id}
                type="button"
                data-active={option.id === filter ? 'true' : 'false'}
                aria-pressed={option.id === filter}
                onClick={() => setFilter(option.id)}
              >
                {option.label} {option.id === 'all' ? rows.length : option.id === 'blocked' ? stopped : allowed}
              </button>
            ))}
          </div>
        </div>

        <div className="feed">
          {visible.map((row) => {
            const allowRule = '@@||' + row.host + '^'
            const allowedAlready = state.customRules.includes(allowRule)
            return (
              <div className="feed-row" key={row.id}>
                <span className="feed-icon">{row.blocked ? <EyeOff /> : <ShieldCheck />}</span>
                <div className="feed-main">
                  <div className="host">{row.host}</div>
                  <div className="rule">{row.blocked ? 'Stopped before it loaded' : 'Allowed to load'}</div>
                </div>
                <div className="feed-side">
                  {row.blocked ? (
                    allowedAlready ? (
                      <span className="badge good">Allowed</span>
                    ) : (
                      <button
                        type="button"
                        className="icon-btn"
                        title={'Always allow requests to ' + row.host}
                        aria-label={'Always allow requests to ' + row.host}
                        onClick={() => {
                          addCustomRule(allowRule)
                          toast.show(row.host + ' allowed')
                        }}
                      >
                        <Undo2 />
                      </button>
                    )
                  ) : null}
                  <time>{relativeTime(row.at)}</time>
                </div>
              </div>
            )
          })}
          {!visible.length ? (
            <div className="empty">
              {needle || filter !== 'all'
                ? 'No request in the log matches that.'
                : 'Nothing logged yet. Run the test lab to watch the engine work, or install the extension for live activity.'}
            </div>
          ) : null}
        </div>

        {!needle && filter === 'all' && !rows.length ? (
          <div className="row" style={{ marginTop: 14 }}>
            <Link to="/tools/lab" className="btn sm">
              <FlaskConical />
              Run the test lab
            </Link>
          </div>
        ) : null}
      </section>

      <p className="footer-note">This log never leaves your device unless you save a copy.</p>

      {toast.node}
    </>
  )
}
