import { PauseCircle, Play } from 'lucide-react'
import { useApp } from '../../lib/useApp'

/**
 * Sites where filtering is stopped. Unlike a trusted site, a paused site keeps
 * its place in the lists and simply stops being filtered until it is resumed —
 * so undoing it is one click and nothing else about protection changes.
 */
export default function PausedSites() {
  const { state, setSitePaused } = useApp()

  return (
    <div style={{ marginTop: 14 }}>
      <div className="mini-label">Paused sites</div>
      <div className="chips" style={{ marginTop: 8 }}>
        {state.pausedSites.map((host) => (
          <span className="chip" key={host}>
            <PauseCircle width={12} height={12} />
            {host}
            <button
              type="button"
              aria-label={'Resume protection on ' + host}
              title={'Resume protection on ' + host}
              onClick={() => setSitePaused(host, false)}
            >
              <Play />
            </button>
          </span>
        ))}
        {!state.pausedSites.length ? (
          <div className="empty">
            Nothing is paused. Use “Pause on this site” in the panel to stop filtering one site
            without touching the rest.
          </div>
        ) : null}
      </div>
    </div>
  )
}
