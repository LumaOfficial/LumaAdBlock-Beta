import { useMemo, useState } from 'react'
import { CalendarClock, Clock3, FlaskConical, ShieldCheck, Trash2 } from 'lucide-react'
import { CardHead } from '../ui'
import LabPanel from '../LabPanel'
import AdHunt from './AdHunt'
import RulesetSprint from './RulesetSprint'
import SignalChase from './SignalChase'
import {
  clearExperimentResults,
  monthlyPreset,
  readResults,
  saveExperimentResult,
} from '../../lib/experiments'
import { relativeTime } from '../../lib/format'
import { useApp } from '../../lib/useApp'

const PANELS = {
  sites: LabPanel,
  ping: SignalChase,
  sprint: RulesetSprint,
  hunt: AdHunt,
}

/**
 * The experiments page: three diagnostics chosen by the month. Each one runs
 * on this device and leaves its result behind, so patterns show up over time.
 */
export default function ExperimentsPanel() {
  const { state } = useApp()
  const preset = useMemo(() => monthlyPreset(), [])
  const [activeId, setActiveId] = useState(preset.picked[0].id)
  const [results, setResults] = useState(readResults)

  const active = preset.picked.find((experiment) => experiment.id === activeId) || preset.picked[0]
  const Panel = PANELS[active.id]
  const mine = results.filter((entry) => entry.month === preset.key)

  function record(result) {
    saveExperimentResult(active.id, { ...result, anonymous: state.privacy })
    setResults(readResults())
  }

  return (
    <>
      <section className="card experiment-banner">
        <div className="row" style={{ alignItems: 'flex-start', gap: 14 }}>
          <span className="feed-icon">
            <CalendarClock />
          </span>
          <div className="grow">
            <div className="eyebrow">{preset.label}</div>
            <h3 style={{ fontFamily: 'var(--display)', fontSize: 20, marginTop: 4 }}>
              This month&apos;s experiments
            </h3>
            <p className="small muted" style={{ marginTop: 4 }}>
              Three rotating checks collect extra diagnostics — games, speed tests and simulations.
              They refresh on {preset.next}.
            </p>
          </div>
        </div>

        <div className="site-switch" style={{ marginTop: 16 }}>
          {preset.picked.map((experiment) => (
            <button
              key={experiment.id}
              type="button"
              className="site-pill"
              data-active={experiment.id === active.id ? 'true' : 'false'}
              onClick={() => setActiveId(experiment.id)}
            >
              {experiment.title}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <CardHead
          title={active.title}
          sub={active.blurb}
        >
          <span className="badge plain">
            <Clock3 />
            {active.minutes} min
          </span>
        </CardHead>
        <Panel onResult={record} />
      </section>

      <section className="card">
        <CardHead title="What this month found" sub="Kept on this device">
          {mine.length ? (
            <button
              type="button"
              className="btn sm ghost"
              onClick={() => {
                clearExperimentResults()
                setResults(readResults())
              }}
            >
              <Trash2 />
              Clear results
            </button>
          ) : null}
        </CardHead>

        {mine.length ? (
          <div className="result-list">
            {mine.map((entry) => (
              <div className="result-row" key={entry.id}>
                <span className="feed-icon">
                  <FlaskConical />
                </span>
                <div className="grow">
                  <div style={{ fontWeight: 600, fontSize: 13 }}>
                    {entry.value}
                    {entry.unit ? ` ${entry.unit}` : ''}
                  </div>
                  <div className="small muted">{entry.label}</div>
                </div>
                <span className="small muted">
                  {entry.at ? relativeTime(entry.at) : 'anonymous'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty">
            Run this month&apos;s experiments and their results will collect here.
          </div>
        )}

        <p className="footer-note">
          {state.privacy ? (
            <>
              <ShieldCheck size={12} style={{ verticalAlign: '-2px', marginRight: 4 }} />
              Privacy mode is on: results are saved without a date, a site or any device detail.
            </>
          ) : (
            'Results stay on this device and are never uploaded.'
          )}
        </p>
      </section>
    </>
  )
}
