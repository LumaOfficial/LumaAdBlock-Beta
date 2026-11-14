import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { KeyRound, X } from 'lucide-react'
import { useAuth } from '../lib/useAuth'

/** Sets a new password for the signed-in account. */
export default function PasswordDialog({ onClose }) {
  const { changePassword } = useAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function submit(event) {
    event.preventDefault()
    if (busy) return
    if (next.length < 8) {
      setError('Use at least 8 characters')
      return
    }
    if (next !== confirm) {
      setError('The two new passwords do not match')
      return
    }
    setBusy(true)
    setError('')
    try {
      await changePassword({ currentPassword: current, newPassword: next })
      setDone(true)
    } catch (problem) {
      setError(problem?.message || 'Could not change the password. Try again.')
    } finally {
      setBusy(false)
    }
  }

  // Portalled to <body>: the account menu sits inside the blurred top bar,
  // which would otherwise clip a fixed-position overlay to the bar itself.
  return createPortal(
    <div
      className="legal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <form
        className="legal-dialog password-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Change password"
        onSubmit={submit}
        noValidate
      >
        <div className="legal-head">
          <KeyRound width={16} height={16} aria-hidden="true" />
          <span className="grow">Change password</span>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="legal-body password-body">
          {done ? (
            <p className="password-done" role="status">
              Your password is updated. Use it the next time you sign in.
            </p>
          ) : (
            <>
              <div className="field">
                <label htmlFor="current-password">Current password</label>
                <input
                  id="current-password"
                  className="input"
                  type="password"
                  autoComplete="current-password"
                  value={current}
                  onChange={(event) => {
                    setCurrent(event.target.value)
                    setError('')
                  }}
                />
              </div>
              <div className="field">
                <label htmlFor="new-password">New password</label>
                <input
                  id="new-password"
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  value={next}
                  onChange={(event) => {
                    setNext(event.target.value)
                    setError('')
                  }}
                />
              </div>
              <div className="field">
                <label htmlFor="confirm-password">Repeat new password</label>
                <input
                  id="confirm-password"
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(event) => {
                    setConfirm(event.target.value)
                    setError('')
                  }}
                />
              </div>
              <p className="small muted">
                Created with an email code or a provider sign-in? Leave the current password empty.
              </p>
              {error ? <p className="field-error">{error}</p> : null}
            </>
          )}
        </div>

        <div className="password-foot">
          <button type="button" className="btn" onClick={onClose}>
            {done ? 'Done' : 'Cancel'}
          </button>
          {done ? null : (
            <button type="submit" className="btn primary" disabled={busy}>
              Save password
            </button>
          )}
        </div>
      </form>
    </div>,
    document.body,
  )
}
