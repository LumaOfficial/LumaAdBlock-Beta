import { useMemo } from 'react'
import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { CardHead } from '../ui'
import { useApp } from '../../lib/useApp'
import { lastNDays, windowTotal } from '../../lib/dates'
import { formatNumber } from '../../lib/format'

/**
 * The seven-day picture against the week before it, in a sentence and three
 * numbers, so the trend is readable without reading a chart.
 */
export default function WeeklyRecap() {
  const { state } = useApp()
  const series = useMemo(() => lastNDays(state, 7), [state])
  const thisWeek = series.reduce((sum, day) => sum + day.count, 0)
  const lastWeek = useMemo(() => windowTotal(state, 7, 7), [state])
  const busiest = series.reduce((best, day) => (day.count > best.count ? day : best), series[0])
  const top = Object.entries(state.domains).sort((a, b) => b[1] - a[1])[0]

  const change = lastWeek ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : null
  const trend = change === null || change === 0 ? 'flat' : change > 0 ? 'up' : 'down'
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus

  const sentence = !thisWeek
    ? 'Nothing has been stopped in the last seven days. Run the test lab, or keep browsing with Luma on, and this fills in.'
    : change === null
      ? `Luma stopped ${formatNumber(thisWeek)} requests in the last seven days — the first week of activity here.`
      : change === 0
        ? `Luma stopped ${formatNumber(thisWeek)} requests this week, exactly as many as the week before.`
        : `Luma stopped ${formatNumber(thisWeek)} requests this week, ${Math.abs(change)}% ${change > 0 ? 'more' : 'fewer'} than the week before.`

  return (
    <div className="card">
      <CardHead title="This week" sub="The last seven days against the week before">
        <span className={'badge ' + (trend === 'up' ? 'good' : 'plain')}>
          <TrendIcon width={12} height={12} />
          {change === null ? 'New' : change === 0 ? 'Steady' : `${change > 0 ? '+' : ''}${change}%`}
        </span>
      </CardHead>

      <p className="small" style={{ color: 'var(--ink-2)' }}>
        {sentence}
      </p>

      <div className="mini-stats">
        <div>
          <span>Seven-day total</span>
          <strong>{formatNumber(thisWeek)}</strong>
          <small>{formatNumber(lastWeek)} the week before</small>
        </div>
        <div>
          <span>Per day</span>
          <strong>{formatNumber(Math.round(thisWeek / 7))}</strong>
          <small>average this week</small>
        </div>
        <div>
          <span>Busiest day</span>
          <strong>{formatNumber(thisWeek ? busiest.count : 0)}</strong>
          <small>{thisWeek ? busiest.label : 'Nothing blocked yet'}</small>
        </div>
      </div>

      {top ? (
        <p className="footer-note" style={{ marginTop: 12 }}>
          Most blocked site so far: {top[0]}
        </p>
      ) : null}
    </div>
  )
}
