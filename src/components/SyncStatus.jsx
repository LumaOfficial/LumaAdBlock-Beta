import { Cloud, CloudOff, RefreshCw } from 'lucide-react'
import { useApp } from '../lib/useApp'
import { useAuth } from '../lib/useAuth'
import { API_BASE } from '../lib/api'

/**
 * One place that says what the account connection is doing, so the dashboard
 * and the account page never disagree: signed out, syncing, synced, offline
 * (changes stay on this device) or a sync that failed.
 */
const STATES = {
  'signed-out': { text: 'Saved on this device only', tone: 'plain' },
  syncing: { text: 'Syncing…', tone: 'plain' },
  synced: { text: 'Synced to your account', tone: 'good' },
  offline: { text: 'Offline — changes stay on this device', tone: 'warn' },
  error: { text: 'Sync problem', tone: 'warn' },
}

function when(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export default function SyncStatus({ compact = false }) {
  const { sync, retrySync } = useApp()
  const { user } = useAuth()

  // A build with no account service (the packaged extension) never syncs, so
  // it says nothing about it.
  if (!API_BASE) return null

  const info = STATES[sync?.status] || STATES['signed-out']
  const offline = sync?.status === 'offline' || sync?.status === 'error'

  if (compact) {
    return (
      <span className="sync-line" data-status={sync?.status || 'signed-out'}>
        {offline ? <CloudOff width={12} height={12} /> : <Cloud width={12} height={12} />}
        {user ? info.text : 'Not signed in'}
      </span>
    )
  }

  return (
    <div className="sync-block">
      <div className="row" style={{ gap: 8 }}>
        <span className={'badge ' + info.tone}>{info.text}</span>
        {sync?.status === 'synced' && sync.at ? (
          <span className="small muted">last saved {when(sync.at)}</span>
        ) : null}
        {offline ? (
          <button type="button" className="btn sm ghost" onClick={() => retrySync()}>
            <RefreshCw width={13} height={13} />
            Try again
          </button>
        ) : null}
      </div>
      {sync?.message ? (
        <p className="small muted" style={{ marginTop: 6 }}>
          {sync.message}
        </p>
      ) : null}
    </div>
  )
}
