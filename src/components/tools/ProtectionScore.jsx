import { Link } from 'react-router-dom'
import { ArrowRight, Award } from 'lucide-react'
import { CardHead } from '../ui'
import { FILTER_LISTS } from '../../lib/blocklists'
import { useApp } from '../../lib/useApp'

const RECOMMENDED = FILTER_LISTS.filter((list) => list.recommended)

function grade(score) {
  if (score >= 90) return 'Excellent'
  if (score >= 75) return 'Strong'
  if (score >= 55) return 'Fair'
  return 'Needs work'
}

/** A single number for the setup, plus the few things worth changing. */
export default function ProtectionScore() {
  const { state, networkRuleCount } = useApp()
  const recommendedOn = RECOMMENDED.filter((list) => state.lists[list.id]).length

  const parts = {
    switchOn: state.protection ? 35 : 0,
    lists: recommendedOn * 12 + (state.lists['social-widgets'] ? 9 : 0),
    rules: state.customRules.length ? 10 : 0,
    quietHours: state.schedule.enabled ? 10 : 0,
  }
  const score = parts.switchOn + parts.lists + parts.rules + parts.quietHours

  const suggestions = []
  if (!state.protection) {
    suggestions.push({ text: 'Protection is off, so nothing is being blocked.', to: '/', label: 'Turn it on' })
  }
  const missing = RECOMMENDED.filter((list) => !state.lists[list.id])
  if (missing.length) {
    suggestions.push({
      text: `${missing.map((list) => list.name).join(' and ')} ${missing.length === 1 ? 'is' : 'are'} off.`,
      to: '/protection',
      label: 'Turn on',
    })
  }
  if (!state.customRules.length) {
    suggestions.push({
      text: 'One-click rules can quiet a specific annoyance you keep seeing.',
      to: '/tools/library',
      label: 'Open the library',
    })
  }
  if (!state.schedule.enabled) {
    suggestions.push({
      text: 'Quiet hours let protection step aside on a schedule you choose.',
      to: '/account',
      label: 'Set quiet hours',
    })
  }

  return (
    <div className="stack">
      <section className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <CardHead title="Protection score" sub="How much of Luma is working for you" />
          <div className="row" style={{ alignItems: 'baseline', gap: 10 }}>
            <div className="stat-value" style={{ fontSize: 56, lineHeight: 1 }}>
              {score}
            </div>
            <span className="badge accent">
              <Award />
              {grade(score)}
            </span>
          </div>
          <div className="feed" style={{ marginTop: 16 }}>
            <div className="feed-row">
              <div className="feed-main">
                <div className="host">Protection switch</div>
                <div className="rule">{state.protection ? 'On' : 'Off'}</div>
              </div>
              <div className="feed-side">
                <span className={'badge ' + (parts.switchOn ? 'good' : 'plain')}>{parts.switchOn}/35</span>
              </div>
            </div>
            <div className="feed-row">
              <div className="feed-main">
                <div className="host">Filter lists</div>
                <div className="rule">
                  {recommendedOn} of {RECOMMENDED.length} recommended lists on
                </div>
              </div>
              <div className="feed-side">
                <span className="badge plain">{parts.lists}/45</span>
              </div>
            </div>
            <div className="feed-row">
              <div className="feed-main">
                <div className="host">Your own rules</div>
                <div className="rule">{state.customRules.length} added</div>
              </div>
              <div className="feed-side">
                <span className="badge plain">{parts.rules}/10</span>
              </div>
            </div>
            <div className="feed-row">
              <div className="feed-main">
                <div className="host">Quiet hours</div>
                <div className="rule">{state.schedule.enabled ? 'Scheduled' : 'Not used'}</div>
              </div>
              <div className="feed-side">
                <span className="badge plain">{parts.quietHours}/10</span>
              </div>
            </div>
          </div>
          <p className="footer-note">
            {networkRuleCount.toLocaleString()} rules are loaded from what you have on.
          </p>
        </div>

        <div className="card">
          <CardHead title="Worth a look" sub={suggestions.length ? 'Small changes, real difference' : 'Nothing to fix'} />
          <div className="stack" style={{ gap: 10 }}>
            {suggestions.map((item) => (
              <Link key={item.text} to={item.to} className="card action-tile">
                <div className="grow">
                  <div className="small">{item.text}</div>
                </div>
                <span className="small muted">{item.label}</span>
                <ArrowRight width={15} height={15} />
              </Link>
            ))}
            {!suggestions.length ? (
              <div className="empty">
                Everything Luma can turn on for you is on. The score grows with your own rules.
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  )
}
