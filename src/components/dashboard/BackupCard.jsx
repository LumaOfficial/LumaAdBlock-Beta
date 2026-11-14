import { useRef, useState } from 'react'
import { Download, FileUp } from 'lucide-react'
import { CardHead, useToast } from '../ui'
import { useApp } from '../../lib/store'
import { downloadBackup, readBackup } from '../../lib/backup'

export default function BackupCard() {
  const { state, importSettings, activeListCount } = useApp()
  const toast = useToast()
  const fileRef = useRef(null)
  const [error, setError] = useState('')

  async function restore(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const result = readBackup(await file.text())
    if (!result.ok) {
      setError(result.error)
      return
    }
    importSettings(result.settings)
    setError('')
    toast.show('Settings restored from backup')
  }

  return (
    <div className="card">
      <CardHead title="Back up your settings" sub="Lists, rules, trusted sites and quiet hours" />

      <div className="backup-summary">
        <div>
          <strong>{activeListCount}</strong>
          <span>lists on</span>
        </div>
        <div>
          <strong>{state.customRules.length}</strong>
          <span>custom rules</span>
        </div>
        <div>
          <strong>{state.allowlist.length}</strong>
          <span>trusted sites</span>
        </div>
      </div>

      <div className="backup-actions">
        <button
          type="button"
          className="btn primary"
          onClick={() => {
            downloadBackup(state)
            toast.show('Settings exported')
          }}
        >
          <Download />
          Export settings
        </button>
        <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
          <FileUp />
          Import backup
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          onChange={restore}
          hidden
        />
      </div>
      {error ? (
        <p className="hint" style={{ color: 'var(--accent-deep)', marginTop: 8 }}>
          {error}
        </p>
      ) : null}

      <p className="footer-note">
        The file is a plain JSON backup of your settings. Counters and browsing history never leave
        this device.
      </p>

      {toast.node}
    </div>
  )
}
