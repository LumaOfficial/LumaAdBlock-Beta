import { ShieldCheck } from 'lucide-react'
import { CardHead } from '../ui'
import { useApp } from '../../lib/store'
import { formatNumber, percent } from '../../lib/format'

export default function BreakdownCard() {
  const { state } = useApp()
  const blocked = state.totals.blocked || 0
  const trackers = Math.min(state.totals.trackers || 0, blocked)
  const ads = Math.max(blocked - trackers, 0)
  const adsShare = blocked ? (ads / blocked) * 100 : 0
  const screenedShare = percent(blocked, state.totals.screened)

  return (
    <div className="card">
      <CardHead title="What was stopped" sub="Ads and trackers, and how much of the page Luma cleaned" />

      {blocked ? (
        <div className="donut-wrap">
          <div
            className="donut"
            style={{
              background:
                'conic-gradient(var(--accent) 0 ' +
                adsShare +
                '%, var(--sage-deep) ' +
                adsShare +
                '% 100%)',
            }}
            role="img"
            aria-label={`${ads} ads and ${trackers} trackers blocked`}
          >
            <div className="donut-center">
              <strong>{formatNumber(blocked)}</strong>
              <small>total</small>
            </div>
          </div>
          <div className="legend">
            <div className="legend-row">
              <span className="legend-dot" style={{ background: 'var(--accent)' }} />
              <span>
                Ads and sponsored placements
                <small>{Math.round(adsShare)}% of everything blocked</small>
              </span>
              <strong>{formatNumber(ads)}</strong>
            </div>
            <div className="legend-row">
              <span className="legend-dot" style={{ background: 'var(--sage-deep)' }} />
              <span>
                Trackers, pixels and analytics
                <small>{Math.round(100 - adsShare)}% of everything blocked</small>
              </span>
              <strong>{formatNumber(trackers)}</strong>
            </div>
          </div>
        </div>
      ) : (
        <div className="empty">
          <ShieldCheck width={18} height={18} style={{ marginBottom: 6 }} />
          <div>Nothing to break down yet. Ads and trackers Luma stops will land here.</div>
        </div>
      )}

      <div className="chart-foot">
        <strong>{screenedShare}%</strong>
        <span className="small muted">
          of {formatNumber(state.totals.screened)} screened requests were stopped
        </span>
      </div>
    </div>
  )
}
