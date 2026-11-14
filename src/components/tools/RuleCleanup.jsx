import { useMemo } from 'react'
import { Eraser, Trash2 } from 'lucide-react'
import { CardHead } from '../ui'
import { FILTER_LISTS } from '../../lib/blocklists'
import { compileRules, evaluateRequest, parseFilter } from '../../lib/engine'
import { useApp } from '../../lib/useApp'

/** A request the rule would match, so the bundled lists can be asked about it. */
function sampleFor(pattern) {
  const body = String(pattern || '')
    .replace(/^@@/, '')
    .replace(/^\|\|/, '')
    .replace(/^\|/, '')
    .replace(/\^$/, '')
  if (!body) return null
  const host = body.split('/')[0]
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(host)) return null
  return { url: `https://${host}/luma-check.gif`, type: 'image' }
}

/** Finds rules you no longer need: covered, broken, or fighting a trusted site. */
export default function RuleCleanup() {
  const { state, removeCustomRule } = useApp()

  const bundled = useMemo(
    () =>
      FILTER_LISTS.filter((list) => state.lists[list.id]).flatMap((list) =>
        compileRules(list.rules, list.id),
      ),
    [state.lists],
  )

  const findings = useMemo(() => {
    const out = []
    for (const rule of state.customRules) {
      const parsed = parseFilter(rule, 'custom')
      if (parsed.kind === 'invalid') {
        out.push({ rule, kind: 'broken', reason: parsed.note || 'Luma cannot read this rule' })
        continue
      }
      if (parsed.kind !== 'network' || parsed.exception) continue
      const sample = sampleFor(parsed.pattern)
      if (!sample) continue
      const coveredBy = evaluateRequest(sample, bundled).rule
      if (coveredBy) {
        const name = FILTER_LISTS.find((list) => list.id === coveredBy.listId)?.name || 'a list'
        out.push({ rule, kind: 'covered', reason: `${name} already blocks this` })
        continue
      }
      const host = sample.url.replace('https://', '').split('/')[0]
      if (state.allowlist.some((entry) => host === entry || host.endsWith('.' + entry))) {
        out.push({ rule, kind: 'trusted', reason: 'You trust this site, so this rule never runs' })
      }
    }
    return out
  }, [state.customRules, state.allowlist, bundled])

  const removable = findings.filter((item) => item.kind === 'covered')

  return (
    <div className="stack">
      <div className="card">
        <CardHead title="Rules you can drop" sub="Checked against the lists you have on">
          <span className="badge plain">
            <Eraser />
            {findings.length} found
          </span>
        </CardHead>

        <div className="feed">
          {findings.map((item) => (
            <div className="feed-row" key={item.rule}>
              <div className="feed-main">
                <div className="host">{item.reason}</div>
                <div className="rule" style={{ wordBreak: 'break-all' }}>
                  {item.rule}
                </div>
              </div>
              <div className="feed-side">
                <span
                  className={'badge ' + (item.kind === 'broken' ? 'warn' : 'plain')}
                >
                  {item.kind === 'broken' ? 'Broken' : item.kind === 'trusted' ? 'Trusted site' : 'Covered'}
                </span>
                <button
                  type="button"
                  className="btn sm ghost"
                  onClick={() => removeCustomRule(item.rule)}
                >
                  <Trash2 />
                  Remove
                </button>
              </div>
            </div>
          ))}
          {!findings.length ? (
            <div className="empty">
              Nothing to clean up — every rule you added is doing something the lists do not.
            </div>
          ) : null}
        </div>

        {removable.length > 1 ? (
          <div className="row" style={{ marginTop: 12 }}>
            <button
              type="button"
              className="btn"
              onClick={() => removable.forEach((item) => removeCustomRule(item.rule))}
            >
              <Trash2 />
              Remove the {removable.length} covered rules
            </button>
          </div>
        ) : null}
      </div>

      <p className="footer-note">
        Nothing is removed on its own — you decide which rules go.
      </p>
    </div>
  )
}
