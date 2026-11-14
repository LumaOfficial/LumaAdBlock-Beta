import { useCallback, useEffect, useState } from 'react'
import { ShieldCheck, Trash2 } from 'lucide-react'
import { CardHead, PageHead } from '../components/ui'
import { useAuth } from '../lib/useAuth'
import { eraseAccount, fetchAccounts } from '../lib/owner'

function methodLabel(via) {
  if (via === 'code') return 'Email code'
  if (via === 'password') return 'Password'
  return via.charAt(0).toUpperCase() + via.slice(1)
}

function joined(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function Owner() {
  const { user } = useAuth()
  const [accounts, setAccounts] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState('')
  const [busy, setBusy] = useState('')

  const load = useCallback(() => {
    setStatus('loading')
    setError('')
    fetchAccounts()
      .then((list) => {
        setAccounts(list)
        setStatus('ready')
      })
      .catch((failure) => {
        setError(failure?.message || 'Could not load the account list.')
        setStatus('ready')
      })
  }, [])

  useEffect(() => {
    if (user?.owner) load()
  }, [user, load])

  async function erase(account) {
    setBusy(account.id)
    setError('')
    try {
      await eraseAccount(account.id)
      setAccounts((current) => current.filter((item) => item.id !== account.id))
      setConfirming('')
    } catch (failure) {
      setError(failure?.message || 'Could not erase that account.')
    } finally {
      setBusy('')
    }
  }

  return (
    <>
      <PageHead
        eyebrow="Owner only — not linked from the app"
        title="Owner console"
        lede="Every account on the service, with a way to erase one completely when its owner asks us to."
      />

      {!user?.owner ? (
        <div className="card">
          <div className="empty">This console belongs to Luma owner accounts. You are signed in as a regular member.</div>
        </div>
      ) : (
        <section className="card">
          <CardHead
            title="Accounts"
            sub={
              status === 'loading'
                ? 'Loading…'
                : `${accounts.length} account${accounts.length === 1 ? '' : 's'} on this service`
            }
          >
            <button type="button" className="btn sm" onClick={load} disabled={status === 'loading'}>
              <ShieldCheck />
              Refresh
            </button>
          </CardHead>

          {error ? (
            <div className="auth-notice" role="alert">
              {error}
            </div>
          ) : null}

          {status === 'ready' && accounts.length === 0 ? (
            <div className="empty">No accounts yet.</div>
          ) : (
            <div className="owner-list">
              {accounts.map((account) => (
                <div className="owner-row" key={account.id}>
                  <div className="owner-who">
                    <div className="owner-name">
                      {account.name || account.email || 'Unnamed account'}
                      {account.owner ? <span className="badge accent">Owner</span> : null}
                      {account.id === user.id ? <span className="badge plain">You</span> : null}
                    </div>
                    <div className="owner-meta">
                      {account.email} · {methodLabel(account.via)} · joined {joined(account.createdAt)}
                      {account.synced ? ' · settings synced' : ''}
                    </div>
                  </div>
                  {account.id === user.id ? (
                    <span className="muted">current sign-in</span>
                  ) : confirming === account.id ? (
                    <div className="row">
                      <button
                        type="button"
                        className="btn sm danger"
                        disabled={busy === account.id}
                        onClick={() => erase(account)}
                      >
                        <Trash2 />
                        Erase everything
                      </button>
                      <button type="button" className="btn sm ghost" onClick={() => setConfirming('')}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="btn sm ghost"
                      disabled={busy === account.id}
                      onClick={() => setConfirming(account.id)}
                    >
                      Erase data
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </>
  )
}
