import { useState } from 'react'
import { Download, RefreshCw, Rss, Trash2 } from 'lucide-react'
import { CardHead } from '../ui'
import { relativeTime } from '../../lib/format'
import { useApp } from '../../lib/useApp'
import {
  PRESET_SUBSCRIPTIONS,
  fetchSubscription,
  isHttpUrl,
  subscriptionLabel,
} from '../../lib/subscriptions'

function newSubscription({ id, url, title, description }) {
  return {
    id,
    url,
    title: title || subscriptionLabel(url),
    description: description || '',
    enabled: true,
    lines: [],
    network: 0,
    cosmetic: 0,
    updatedAt: null,
  }
}

/**
 * Filter lists kept somewhere else. The person subscribes by address; Luma
 * downloads the text, and the rules join the protection like the bundled ones.
 */
export default function Subscriptions() {
  const {
    state,
    addSubscription,
    updateSubscription,
    toggleSubscription,
    removeSubscription,
  } = useApp()
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  const subscriptions = state.subscriptions || []
  const known = new Set(subscriptions.map((item) => item.url))
  const activeRules = subscriptions
    .filter((item) => item.enabled)
    .reduce((sum, item) => sum + (item.network || 0) + (item.cosmetic || 0), 0)

  async function download(subscription) {
    setBusy(subscription.id)
    setError('')
    try {
      const parsed = await fetchSubscription(subscription.url)
      updateSubscription(subscription.id, { ...parsed, updatedAt: new Date().toISOString() })
    } catch (err) {
      setError(err?.message || 'The list could not be downloaded.')
    } finally {
      setBusy('')
    }
  }

  async function add(event) {
    event.preventDefault()
    const target = url.trim()
    if (!isHttpUrl(target)) {
      setError('Paste the full address of a filter list, starting with https://')
      return
    }
    if (known.has(target)) {
      setError('That list is already subscribed.')
      return
    }
    const subscription = newSubscription({
      id: 'sub-' + target.replace(/[^a-z0-9]+/gi, '-').slice(-48),
      url: target,
    })
    addSubscription(subscription)
    setUrl('')
    await download(subscription)
  }

  async function addPreset(preset) {
    const subscription = newSubscription(preset)
    addSubscription(subscription)
    await download(subscription)
  }

  return (
    <div className="stack">
      <section className="card">
        <CardHead title="Ready-made lists" sub="Beyond what Luma already ships">
          <span className="badge plain">
            <Rss />
            {subscriptions.length}/{6}
          </span>
        </CardHead>
        <div className="grid-2">
          {PRESET_SUBSCRIPTIONS.map((preset) => {
            const added = known.has(preset.url)
            const working = busy === preset.id
            return (
              <div className="note" key={preset.id}>
                <div style={{ fontWeight: 600 }}>{preset.title}</div>
                <div className="small muted" style={{ marginTop: 4 }}>
                  {preset.description}
                </div>
                <button
                  type="button"
                  className="btn sm"
                  style={{ marginTop: 10 }}
                  disabled={added || working}
                  onClick={() => addPreset(preset)}
                >
                  <Download />
                  {added ? 'Added' : working ? 'Downloading…' : 'Add'}
                </button>
              </div>
            )
          })}
        </div>
      </section>

      <section className="card">
        <CardHead title="Your subscriptions" sub="Downloaded here, applied everywhere">
          <span className="badge plain">
            {activeRules.toLocaleString()} rules on
          </span>
        </CardHead>

        <form className="row" style={{ gap: 8, flexWrap: 'wrap', marginBottom: 14 }} onSubmit={add}>
          <div className="field grow" style={{ minWidth: 220 }}>
            <label htmlFor="subscription-url">List address</label>
            <input
              id="subscription-url"
              className="input"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com/filters.txt"
              spellCheck="false"
            />
          </div>
          <button type="submit" className="btn" disabled={Boolean(busy)}>
            <Download />
            Subscribe
          </button>
        </form>

        {error ? <p className="hint" style={{ color: 'var(--danger, #b42318)' }}>{error}</p> : null}

        <div className="feed">
          {subscriptions.map((item) => (
            <div className="feed-row" key={item.id}>
              <div className="feed-main">
                <div className="host">{item.title}</div>
                <div className="rule">
                  {item.lines.length
                    ? `${item.network.toLocaleString()} blocking · ${item.cosmetic.toLocaleString()} hiding · ${
                        item.updatedAt ? 'updated ' + relativeTime(item.updatedAt) : 'not downloaded'
                      }`
                    : 'Not downloaded yet'}
                </div>
              </div>
              <div className="feed-side" style={{ flexWrap: 'wrap', gap: 6 }}>
                <button
                  type="button"
                  className="btn sm ghost"
                  disabled={busy === item.id}
                  onClick={() => download(item)}
                >
                  <RefreshCw />
                  {busy === item.id ? 'Downloading…' : 'Refresh'}
                </button>
                <button type="button" className="btn sm ghost" onClick={() => toggleSubscription(item.id)}>
                  {item.enabled ? 'Pause' : 'Turn on'}
                </button>
                <button type="button" className="btn sm ghost" onClick={() => removeSubscription(item.id)}>
                  <Trash2 />
                  Remove
                </button>
              </div>
            </div>
          ))}
          {!subscriptions.length ? (
            <div className="empty">
              No subscriptions yet. Add one above, or start with a ready-made list.
            </div>
          ) : null}
        </div>

        <p className="footer-note">
          Lists are downloaded from the address you see when you add or refresh them. One list is capped
          at 1,200 blocking and 600 hiding rules, so a very long list cannot crowd out the rest.
        </p>
      </section>
    </div>
  )
}
