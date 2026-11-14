import { useEffect, useRef, useState } from 'react'
import { LogOut } from 'lucide-react'
import { useAuth } from '../lib/useAuth'

export default function AccountMenu() {
  const { user, stateLabel, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    function onPointer(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    function onKey(event) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!user) return null

  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
  const firstName = user.name.split(/\s+/)[0]

  return (
    <div className="account" ref={rootRef}>
      <button
        type="button"
        className="account-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="avatar" aria-hidden="true">
          {initials}
        </span>
        <span className="account-name">{firstName}</span>
      </button>

      {open ? (
        <div className="account-menu" role="menu">
          <div className="account-menu-head">
            <div className="account-menu-name">
              {user.name}
              {user.owner ? <span className="badge accent">Owner</span> : null}
            </div>
            <div className="account-menu-email">{user.email}</div>
          </div>
          <div className="account-menu-meta">
            <span>Signed in on this device</span>
            {stateLabel ? <span>{stateLabel}</span> : null}
          </div>
          <button type="button" className="account-signout" role="menuitem" onClick={signOut}>
            <LogOut />
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  )
}
