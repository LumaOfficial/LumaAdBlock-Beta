import { useMemo } from 'react'
import { MousePointerClick, Trash2 } from 'lucide-react'
import { CardHead } from '../ui'
import { useApp } from '../../lib/useApp'
import { isExtension } from '../../lib/platform'

/** A readable name for a picked element, without showing the selector itself. */
function friendly(selector) {
  const text = String(selector || '')
  const name = (/\.([a-zA-Z][\w-]{1,39})/.exec(text) || /#([a-zA-Z][\w-]{1,39})/.exec(text) || [])[1]
  if (!name) return 'Element'
  const words = name
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim()
  if (!words) return 'Element'
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/**
 * What the person removed by hand with the click-to-block picker, grouped by
 * the site it applies to. Picking happens on the page (panel, right-click or a
 * keyboard shortcut); this is where those choices are reviewed and undone.
 */
export default function ElementPicker() {
  const { state, removePickerRule } = useApp()
  const sites = useMemo(
    () =>
      Object.entries(state.pickerRules || {})
        .map(([host, selectors]) => [host, [...selectors].sort()])
        .sort((a, b) => a[0].localeCompare(b[0])),
    [state.pickerRules],
  )
  const total = sites.reduce((sum, [, selectors]) => sum + selectors.length, 0)

  return (
    <div className="stack">
      <section className="card">
        <CardHead title="Point and block" sub="Remove one thing on a page, for good">
          <span className="badge plain">
            <MousePointerClick />
            {total}
          </span>
        </CardHead>
        <p className="small muted" style={{ marginTop: -4 }}>
          Open the Luma panel on the page you are on and press <strong>Block an element</strong>, then
          click the thing you never want to see again. Right-clicking a page offers the same action, and
          <strong> Alt+Shift+E</strong> starts it without the panel.
        </p>
        {!isExtension ? (
          <p className="hint">
            Picking happens in the browser extension. This page lists the elements you have already
            blocked, and lets you undo them.
          </p>
        ) : null}
      </section>

      <section className="card">
        <CardHead title="Blocked elements" sub="Only on the site you picked them" />
        <div className="feed">
          {sites.map(([host, selectors]) => (
            <div key={host} className="stack" style={{ gap: 8 }}>
              <div className="eyebrow">{host}</div>
              {selectors.map((selector) => (
                <div className="feed-row" key={selector}>
                  <div className="feed-main">
                    <div className="host">{friendly(selector)}</div>
                    <div className="rule">Never shown on this site</div>
                  </div>
                  <div className="feed-side">
                    <button
                      type="button"
                      className="btn sm ghost"
                      onClick={() => removePickerRule(host, selector)}
                    >
                      <Trash2 />
                      Stop blocking
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
          {!sites.length ? (
            <div className="empty">
              Nothing picked by hand yet. Everything you block with the picker appears here, grouped by
              site.
            </div>
          ) : null}
        </div>
        <p className="footer-note">
          Picked elements are hidden on the site you chose them on, and travel with your settings to your
          other devices.
        </p>
      </section>
    </div>
  )
}
