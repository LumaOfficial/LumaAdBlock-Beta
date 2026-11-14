import { useState } from 'react'
import { Ban, EyeOff, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { CardHead, useToast } from '../ui'
import { compileRules, evaluateRequest, hostnameOf, parseFilter } from '../../lib/engine'
import { useApp } from '../../lib/useApp'

const MODES = [
  { id: 'block', label: 'Block a site', icon: Ban },
  { id: 'allow', label: 'Allow a site', icon: ShieldCheck },
  { id: 'hide', label: 'Hide something', icon: EyeOff },
]

const HIDE_PRESETS = [
  { id: 'promoted', label: 'Promoted post', selector: '.promoted-post' },
  { id: 'sponsored', label: 'Sponsored card', selector: '.sponsored' },
  { id: 'cookie', label: 'Cookie banner', selector: '.cookie-banner' },
  { id: 'newsletter', label: 'Newsletter popup', selector: '.newsletter-popup' },
  { id: 'sticky', label: 'Sticky subscribe bar', selector: '.sticky-cta' },
  { id: 'chat', label: 'Support chat bubble', selector: '.chat-widget' },
  { id: 'slot', label: 'Sidebar ad slot', selector: '.ad-slot' },
]

const HOST_PATTERN = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i

/**
 * The same rules Protection holds, built from plain answers instead of filter
 * syntax: pick an outcome, name the site, and Luma writes and checks the rule.
 */
export default function RuleBuilder() {
  const { state, addCustomRule, removeCustomRule } = useApp()
  const [mode, setMode] = useState('block')
  const [site, setSite] = useState('')
  const [presetId, setPresetId] = useState(HIDE_PRESETS[0].id)
  const toast = useToast()

  const host = hostnameOf(site)
  const hostOk = Boolean(host) && HOST_PATTERN.test(host)
  const siteTyped = site.trim().length > 0
  const preset = HIDE_PRESETS.find((item) => item.id === presetId) || HIDE_PRESETS[0]

  const rule =
    mode === 'hide'
      ? (hostOk ? host : '') + '##' + preset.selector
      : (mode === 'allow' ? '@@||' : '||') + host + '^'

  const ready = mode === 'hide' ? !siteTyped || hostOk : hostOk
  const added = ready && state.customRules.includes(rule)

  // The preview runs the real engine, so "ready" means the rule really applies.
  let outcome = null
  if (ready) {
    const parsed = parseFilter(rule, 'custom')
    if (parsed.kind === 'invalid') {
      outcome = { tone: 'warn', title: 'Luma cannot read that rule', detail: parsed.note }
    } else if (mode === 'block') {
      const compiled = compileRules([rule], 'custom')
      const decided = evaluateRequest(
        { url: 'https://' + host + '/banner.js', type: 'script' },
        compiled,
      )
      outcome = decided.blocked
        ? {
            tone: 'good',
            title: 'Ready to block',
            detail: `Requests to ${host} will be stopped before they reach the page.`,
          }
        : {
            tone: 'warn',
            title: 'That address would not be caught',
            detail: 'Check the spelling of the site address.',
          }
    } else if (mode === 'allow') {
      outcome = {
        tone: 'good',
        title: 'Ready to allow',
        detail: `Requests to ${host} will load, even where one of your lists blocks them.`,
      }
    } else {
      outcome = {
        tone: 'good',
        title: 'Ready to hide',
        detail: `The ${preset.label.toLowerCase()} will be hidden ${
          hostOk ? 'on ' + host : 'on every site you visit'
        }.`,
      }
    }
  }

  return (
    <div className="stack">
      <section className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <CardHead title="What do you want to do?" sub="Two answers and the rule is written for you" />

          <div className="field">
            <label htmlFor="builder-mode">Outcome</label>
            <div className="seg" role="group" aria-label="Outcome" id="builder-mode">
              {MODES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  data-active={item.id === mode ? 'true' : 'false'}
                  aria-pressed={item.id === mode}
                  onClick={() => setMode(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="field" style={{ marginTop: 14 }}>
            <label htmlFor="builder-site">
              {mode === 'hide' ? 'Site (leave empty for everywhere)' : 'Site address'}
            </label>
            <input
              id="builder-site"
              className="input mono"
              placeholder="news.example.com"
              spellCheck="false"
              value={site}
              onChange={(event) => setSite(event.target.value)}
            />
          </div>

          {mode === 'hide' ? (
            <div className="field" style={{ marginTop: 14 }}>
              <label htmlFor="builder-preset">What should be hidden?</label>
              <select
                id="builder-preset"
                className="select"
                value={presetId}
                onChange={(event) => setPresetId(event.target.value)}
              >
                {HIDE_PRESETS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {siteTyped && !hostOk && mode !== 'hide' ? (
            <p className="hint" style={{ color: 'var(--accent-deep)', marginTop: 8 }}>
              That does not look like a site address. Try something like news.example.com.
            </p>
          ) : null}
        </div>

        <div className="card">
          <CardHead title="What this will do" sub="Checked against your real engine">
            {added ? <span className="badge good">In your protection</span> : null}
          </CardHead>

          {outcome ? (
            <div className="verdict" data-ok={outcome.tone === 'good' ? 'true' : 'false'}>
              <strong>{outcome.title}</strong>
              <p>{outcome.detail}</p>
            </div>
          ) : (
            <div className="empty">
              {mode === 'hide'
                ? 'Name a site, or leave it empty to hide this on every site.'
                : 'Enter a site address to see what the rule would do.'}
            </div>
          )}

          <div className="row" style={{ marginTop: 14 }}>
            {added ? (
              <button
                type="button"
                className="btn"
                onClick={() => {
                  removeCustomRule(rule)
                  toast.show('Rule removed')
                }}
              >
                <Trash2 />
                Remove from protection
              </button>
            ) : (
              <button
                type="button"
                className="btn primary"
                disabled={!ready || outcome?.tone !== 'good'}
                onClick={() => {
                  addCustomRule(rule)
                  toast.show('Rule added to your protection')
                }}
              >
                <Plus />
                Add to my protection
              </button>
            )}
          </div>
        </div>
      </section>

      <p className="footer-note">
        Built rules appear on Protection with your other rules, follow you to every device signed in
        to your account, and can be removed here or there.
      </p>

      {toast.node}
    </div>
  )
}
