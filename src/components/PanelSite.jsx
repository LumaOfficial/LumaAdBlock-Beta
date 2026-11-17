import { useEffect, useState } from 'react'
import { Globe, Pause, Play } from 'lucide-react'
import { isExtension, readActiveSite } from '../lib/platform'
import { siteHost, siteMode, SITE_LABELS } from '../lib/sites'
import { siteOf } from '../lib/engine'
import { useApp } from '../lib/useApp'

/**
 * The site in the tab the panel was opened from, with the two things a person
 * wants there: stop filtering this one site, or trust it completely.
 */
export default function PanelSite() {
  const { state, setSitePaused, addAllow, removeAllow } = useApp()
  const [host, setHost] = useState('')

  useEffect(() => {
    if (!isExtension) return undefined
    let alive = true
    readActiveSite().then((value) => alive && setHost(siteHost(value)))
    return () => {
      alive = false
    }
  }, [])

  if (!isExtension || !host) return null

  // One site, not one subdomain: news.example.com and example.com are the same
  // site to the person, and both lists match subdomains.
  const site = siteOf(host) || host
  const mode = siteMode(state, host)

  return (
    <div className="panel-site">
      <div className="row" style={{ gap: 8 }}>
        <Globe width={14} height={14} />
        <span className="grow panel-site-host" title={host}>
          {site}
        </span>
        <span className={'badge ' + (mode === 'protected' ? 'good' : 'warn')}>
          {SITE_LABELS[mode]}
        </span>
      </div>

      <div className="row" style={{ gap: 6, marginTop: 8 }}>
        {mode === 'trusted' ? (
          <button type="button" className="btn sm ghost" onClick={() => removeAllow(site)}>
            <Play width={13} height={13} />
            Protect this site again
          </button>
        ) : mode === 'paused' ? (
          <button type="button" className="btn sm ghost" onClick={() => setSitePaused(site, false)}>
            <Play width={13} height={13} />
            Resume protection
          </button>
        ) : (
          <button type="button" className="btn sm ghost" onClick={() => setSitePaused(site, true)}>
            <Pause width={13} height={13} />
            Pause on this site
          </button>
        )}
        {mode !== 'trusted' ? (
          <button type="button" className="btn sm ghost" onClick={() => addAllow(site)}>
            Trust site
          </button>
        ) : null}
      </div>
    </div>
  )
}
