import { useMemo, useState } from 'react'
import { CardHead } from '../ui'
import { FILTER_LISTS } from '../../lib/blocklists'
import { hostnameOf, screenRequest } from '../../lib/engine'
import { useApp } from '../../lib/useApp'

const SAMPLE = [
  'https://ad.doubleclick.net/ddm/ad/banner.gif',
  'https://www.google-analytics.com/collect?v=1&t=pageview',
  'https://static.hotjar.com/c/hotjar.js',
  'https://news.dailybyte.test/assets/app.js',
].join('\n')

const TYPES = ['image', 'script', 'xmlhttprequest', 'ping', 'subdocument', 'stylesheet', 'media', 'font']
const MAX_LINES = 40

function sourceName(id) {
  if (id === 'custom') return 'Your own rule'
  if (id === 'learned') return 'Picked up by Luma'
  return FILTER_LISTS.find((list) => list.id === id)?.name || 'A rule'
}

/** Paste a list of addresses and see what Luma would do with each one. */
export default function BulkCheck() {
  const { rules, state, protectionNow } = useApp()
  const [text, setText] = useState(SAMPLE)
  const [type, setType] = useState('image')

  const rows = useMemo(() => {
    const lines = text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, MAX_LINES)
    return lines.map((url) => {
      const decision = screenRequest(
        { url, type },
        { rules, allowlist: state.allowlist, protection: protectionNow, pageHost: '' },
      )
      return {
        url,
        host: hostnameOf(url) || url.slice(0, 40),
        status: decision.status,
        by: decision.listId ? sourceName(decision.listId) : '',
      }
    })
  }, [text, type, rules, state.allowlist, protectionNow])

  const blocked = rows.filter((row) => row.status === 'blocked').length
  const overLimit = text.split('\n').filter((line) => line.trim()).length > MAX_LINES

  return (
    <section className="grid-2" style={{ alignItems: 'start' }}>
      <div className="card">
        <CardHead title="Addresses to check" sub="One per line, up to 40" />
        <div className="stack" style={{ gap: 12 }}>
          <div className="field">
            <label htmlFor="bulk-urls">Links</label>
            <textarea
              id="bulk-urls"
              className="textarea mono"
              rows={8}
              value={text}
              spellCheck="false"
              onChange={(event) => setText(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="bulk-type">Treat them as</label>
            <select
              id="bulk-type"
              className="select"
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              {TYPES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <span className="badge plain">{rows.length} checked</span>
            <span className="badge warn">{blocked} blocked</span>
            <span className="badge good">{rows.length - blocked} allowed</span>
          </div>
          {overLimit ? (
            <p className="hint">Only the first {MAX_LINES} addresses are checked at a time.</p>
          ) : null}
        </div>
      </div>

      <div className="card">
        <CardHead title="Results" sub="Nothing leaves your device" />
        <div className="feed">
          {rows.map((row, index) => (
            <div className="feed-row" key={row.url + index}>
              <div className="feed-main">
                <div className="host">{row.host}</div>
                <div className="rule">
                  {row.status === 'blocked'
                    ? row.by
                    : row.status === 'allowlisted'
                      ? 'This site is trusted'
                      : row.status === 'paused'
                        ? 'Protection is paused'
                        : 'Nothing matched'}
                </div>
              </div>
              <div className="feed-side">
                <span className={'badge ' + (row.status === 'blocked' ? 'warn' : 'plain')}>
                  {row.status === 'blocked' ? 'Blocked' : 'Allowed'}
                </span>
              </div>
            </div>
          ))}
          {!rows.length ? <div className="empty">Add a few links on the left to check them.</div> : null}
        </div>
      </div>
    </section>
  )
}
