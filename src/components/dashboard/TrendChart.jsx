import { useMemo, useState } from 'react'
import { CardHead } from '../ui'
import { useApp } from '../../lib/useApp'
import { lastNDays } from '../../lib/dates'
import { formatNumber } from '../../lib/format'

const RANGES = [7, 14, 30]

export default function TrendChart() {
  const { state } = useApp()
  const [range, setRange] = useState(7)
  const series = useMemo(() => lastNDays(state, range), [state, range])

  const total = series.reduce((sum, day) => sum + day.count, 0)
  const max = Math.max(...series.map((day) => day.count), 1)
  const busiest = series.reduce((best, day) => (day.count > best.count ? day : best), series[0])
  const quiet = series.filter((day) => !day.count).length

  return (
    <div className="card">
      <CardHead title="Blocking trend" sub="Requests stopped per day, your local timezone">
        <div className="seg" role="group" aria-label="Chart range">
          {RANGES.map((option) => (
            <button
              key={option}
              type="button"
              data-active={option === range ? 'true' : 'false'}
              onClick={() => setRange(option)}
            >
              {option}d
            </button>
          ))}
        </div>
      </CardHead>

      <div
        className="chart"
        role="img"
        aria-label={`Blocked requests for the last ${range} days, totalling ${total}`}
      >
        {series.map((day, index) => (
          <div className="chart-col" key={day.key}>
            <div className="chart-bar-track">
              <div
                className={'chart-bar' + (index === series.length - 1 ? ' today' : '')}
                style={{
                  height: day.count ? Math.max(7, Math.round((day.count / max) * 100)) + '%' : '0%',
                }}
                title={`${formatNumber(day.count)} blocked`}
              />
            </div>
            <span>
              {range > 14
                ? index % 5 === 0 || index === series.length - 1
                  ? day.label
                  : ''
                : day.label}
            </span>
          </div>
        ))}
      </div>

      <div className="chart-foot">
        <strong>{formatNumber(total)}</strong>
        <span className="small muted">
          blocked in {range} days · {formatNumber(Math.round(total / range))} per day
        </span>
      </div>

      <div className="mini-stats">
        <div>
          <span>Busiest day</span>
          <strong>{formatNumber(total ? busiest.count : 0)}</strong>
          <small>{total ? busiest.label : 'Nothing blocked yet'}</small>
        </div>
        <div>
          <span>Today</span>
          <strong>{formatNumber(series[series.length - 1].count)}</strong>
          <small>{series[series.length - 1].label}</small>
        </div>
        <div>
          <span>Quiet days</span>
          <strong>{formatNumber(quiet)}</strong>
          <small>{quiet === 1 ? 'day with nothing blocked' : 'days with nothing blocked'}</small>
        </div>
      </div>
    </div>
  )
}
