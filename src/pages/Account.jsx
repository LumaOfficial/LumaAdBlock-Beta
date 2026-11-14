import { useState } from 'react'
import { EyeOff, KeyRound, LogOut, Monitor, Moon, Sun, Trash2 } from 'lucide-react'
import { CardHead, PageHead, Switch } from '../components/ui'
import PasswordDialog from '../components/PasswordDialog'
import ScheduleCard from '../components/dashboard/ScheduleCard'
import BackupCard from '../components/dashboard/BackupCard'
import { useApp } from '../lib/useApp'
import { useAuth } from '../lib/useAuth'
import { formatNumber } from '../lib/format'

const THEMES = [
  { id: 'system', label: 'System', icon: Monitor },
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
]

function methodLabel(via) {
  if (via === 'code') return 'email code'
  if (via === 'password') return 'password'
  return via
}

function joined(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function Account() {
  const { user, stateLabel, signOut } = useAuth()
  const { state, resetCounters, setTheme, setPrivacy } = useApp()
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  const initials = (user?.name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  return (
    <>
      <PageHead
        eyebrow="Account"
        title="Your account and settings."
        lede="The account your protection settings sync to, plus the look and privacy choices that follow you."
      />

      <section className="grid-2">
        <div className="card">
          <CardHead title="Profile" sub="One sign-in on every device" />

          <div className="owner-row">
            <div className="owner-who">
              <div className="owner-name">
                <span className="avatar" aria-hidden="true">
                  {initials}
                </span>
                {user?.name}
                {user?.owner ? <span className="badge accent">Owner</span> : null}
              </div>
              <div className="owner-meta">
                {user?.email} · signed in with {methodLabel(user?.via)} · joined{' '}
                {joined(user?.createdAt)}
              </div>
            </div>
          </div>

          <div className="owner-row">
            <div className="owner-who">
              <div className="owner-name">Region</div>
              <div className="owner-meta">{stateLabel || 'Not set'}</div>
            </div>
          </div>

          <div className="owner-row">
            <div className="owner-who">
              <div className="owner-name">Settings sync</div>
              <div className="owner-meta">
                {formatNumber(Object.values(state.lists).filter(Boolean).length)} lists,{' '}
                {formatNumber(state.customRules.length)} custom rules and{' '}
                {formatNumber(state.allowlist.length)} trusted sites saved to this account
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <CardHead title="Password" sub="Use it with your email to sign in" />
          <p className="small muted">
            Signed up with a provider or an email code? Set a password here and either way works.
          </p>
          <div className="row" style={{ marginTop: 12 }}>
            <button type="button" className="btn primary" onClick={() => setPasswordOpen(true)}>
              <KeyRound />
              Change password
            </button>
          </div>
          <p className="footer-note">
            Your password is stored only as a hash on the account service — never in this browser.
          </p>
        </div>
      </section>

      <section className="grid-2">
        <div className="card">
          <CardHead title="Theme" sub="How Luma looks, on every device you sign in to" />
          <div className="theme-options" role="group" aria-label="Theme">
            {THEMES.map((option) => {
              const Icon = option.icon
              return (
                <button
                  key={option.id}
                  type="button"
                  className="theme-option"
                  data-active={state.theme === option.id ? 'true' : 'false'}
                  aria-pressed={state.theme === option.id}
                  onClick={() => setTheme(option.id)}
                >
                  <Icon />
                  {option.label}
                </button>
              )
            })}
          </div>
          <p className="footer-note">
            System follows your device&apos;s light or dark setting and switches with it.
          </p>
        </div>

        <div className="card">
          <CardHead title="Privacy mode" sub="No blocking, anonymous diagnostics">
            <Switch on={state.privacy} onChange={setPrivacy} label="Privacy mode" />
          </CardHead>
          <p className="small muted">
            Turns every block off and pauses anything that could identify you. Diagnostics keep
            running, but they forget the who: no site names, no addresses and no activity log.
          </p>
          {state.privacy ? (
            <div className="note" style={{ marginTop: 12 }}>
              <div className="row" style={{ gap: 8 }}>
                <EyeOff width={14} height={14} />
                <strong>Private browsing is on.</strong>
              </div>
              <p className="small muted" style={{ marginTop: 4 }}>
                Ads are loading, and the pages you visit are not recorded. Anything collected before
                now stays on this device until you reset counters.
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid-2">
        <ScheduleCard />
        <BackupCard />
      </section>

      <section className="card">
        <CardHead title="This device" sub="Counters live here; settings live in your account" />
        <div className="row">
          <button type="button" className="btn" onClick={signOut}>
            <LogOut />
            Sign out
          </button>
          {confirmReset ? (
            <>
              <button
                type="button"
                className="btn danger"
                onClick={() => {
                  resetCounters()
                  setConfirmReset(false)
                }}
              >
                <Trash2 />
                Yes, reset counters
              </button>
              <button type="button" className="btn ghost" onClick={() => setConfirmReset(false)}>
                Cancel
              </button>
            </>
          ) : (
            <button type="button" className="btn ghost" onClick={() => setConfirmReset(true)}>
              <Trash2 />
              Reset counters
            </button>
          )}
        </div>
        <p className="footer-note">
          Resetting counters clears the blocking numbers and the activity log on this device. Your
          lists, rules and trusted sites stay as they are.
        </p>
      </section>

      {passwordOpen ? <PasswordDialog onClose={() => setPasswordOpen(false)} /> : null}
    </>
  )
}
