import { useMemo, useState } from 'react'
import { CardHead } from '../ui'
import { FILTER_LISTS } from '../../lib/blocklists'
import { compileRules, evaluateRequest } from '../../lib/engine'
import { useApp } from '../../lib/useApp'

const TYPES = ['image', 'script', 'xmlhttprequest', 'ping', 'subdocument', 'stylesheet', 'media', 'font']

/** Which of your lists actually catches a given address. */
export default function ListCoverage() {
  const { state } = useApp()
  const [url, setUrl] = useState('https://ad.doubleclick.net/ddm/ad/banner.gif')
  const [type, setType] = useState('image')

  const rows = useMemo(
    () =>
      FILTER_LISTS.map((list) => {
        const compiled = compileRules(list.rules, list.id)
        return {
          list,
          on: Boolean(state.lists[list.id]),
          blocked: evaluateRequest({ url, type }, compiled).blocked,
        }
      }),
    [url, type, state.lists],
  )

  const hits = rows.filter((row) => row.blocked).length

  return (
    <section className="grid-2" style={{ alignItems: 'start' }}>
      <div className="card">
        <CardHead title="The address" sub="Compare it against every list" />
        <div className="stack" style={{ gap: 12 }}>
          <div className="field">
            <label htmlFor="coverage-url">Link</label>
            <input
              id="coverage-url"
              className="input mono"
              value={url}
              spellCheck="false"
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://ads.example.com/banner.js"
            />
          </div>
          <div className="field">
            <label htmlFor="coverage-type">Treat it as</label>
            <select
              id="coverage-type"
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
          <p className="hint">
            {hits
              ? `${hits} of your lists ${hits === 1 ? 'catches' : 'catch'} this address.`
              : 'None of your lists know this address.'}
          </p>
        </div>
      </div>

      <div className="card">
        <CardHead title="Lists" sub="On or off, and whether it would catch this" />
        <div className="feed">
          {rows.map((row) => (
            <div className="feed-row" key={row.list.id}>
              <div className="feed-main">
                <div className="host">{row.list.name}</div>
                <div className="rule">{row.list.description}</div>
              </div>
              <div className="feed-side">
                <span className={'badge ' + (row.on ? 'good' : 'plain')}>{row.on ? 'On' : 'Off'}</span>
                <span className={'badge ' + (row.blocked ? 'warn' : 'plain')}>
                  {row.blocked ? 'Catches it' : 'Misses it'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
