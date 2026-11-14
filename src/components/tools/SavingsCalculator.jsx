import { useMemo, useState } from 'react'
import { Wallet } from 'lucide-react'
import { CardHead } from '../ui'
import { formatMegabytes, formatNumber } from '../../lib/format'

// Same estimate the dashboard uses for a blocked ad plus its trackers.
const MEGABYTES_PER_AD = 0.09

/** Turns "how much do you browse" into what blocking saves over a month. */
export default function SavingsCalculator() {
  const [pages, setPages] = useState(40)
  const [ads, setAds] = useState(8)

  const totals = useMemo(() => {
    const perDay = Math.max(0, pages) * Math.max(0, ads)
    const month = perDay * 30
    const megabytes = month * MEGABYTES_PER_AD
    const data = formatMegabytes(megabytes)
    return {
      perDay,
      month,
      year: month * 12,
      dataValue: data.value,
      dataUnit: data.unit,
      yearValue: formatMegabytes(megabytes * 12).value,
      yearUnit: formatMegabytes(megabytes * 12).unit,
    }
  }, [pages, ads])

  return (
    <div className="stack">
      <section className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <CardHead title="Your browsing" sub="Rough numbers are enough" />
          <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
            <div className="field grow" style={{ minWidth: 140 }}>
              <label htmlFor="pages">Pages a day</label>
              <input
                id="pages"
                className="input"
                type="number"
                min="0"
                max="500"
                value={pages}
                onChange={(event) => setPages(Number(event.target.value) || 0)}
              />
            </div>
            <div className="field grow" style={{ minWidth: 140 }}>
              <label htmlFor="ads">Ads per page</label>
              <input
                id="ads"
                className="input"
                type="number"
                min="0"
                max="60"
                value={ads}
                onChange={(event) => setAds(Number(event.target.value) || 0)}
              />
            </div>
          </div>
          <p className="hint" style={{ marginTop: 12 }}>
            One blocked ad plus the trackers that follow it is about 0.09 MB.
          </p>
        </div>

        <div className="card">
          <CardHead title="What that saves" sub="Nothing is measured or sent anywhere" />
          <div className="stat-grid">
            <div className="stat">
              <div className="stat-label">Stopped a day</div>
              <div className="stat-value">{formatNumber(totals.perDay)}</div>
              <div className="stat-foot">ads and trackers</div>
            </div>
            <div className="stat">
              <div className="stat-label">Stopped a month</div>
              <div className="stat-value">{formatNumber(totals.month)}</div>
              <div className="stat-foot">on your usual browsing</div>
            </div>
            <div className="stat">
              <div className="stat-label">Data a month</div>
              <div className="stat-value">
                {totals.dataValue}
                <small>{totals.dataUnit}</small>
              </div>
              <div className="stat-foot">never downloaded</div>
            </div>
            <div className="stat">
              <div className="stat-label">Data a year</div>
              <div className="stat-value">
                {totals.yearValue}
                <small>{totals.yearUnit}</small>
              </div>
              <div className="stat-foot">{formatNumber(totals.year)} ads stopped</div>
            </div>
          </div>
        </div>
      </section>

      <p className="footer-note">
        <Wallet size={12} style={{ verticalAlign: '-2px', marginRight: 4 }} />
        An estimate for context, not a bill. Your real numbers are on the dashboard.
      </p>
    </div>
  )
}
