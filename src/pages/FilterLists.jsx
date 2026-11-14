import { useState } from 'react'
import { Info, Plus, ShieldCheck, Trash2, X } from 'lucide-react'
import { FILTER_LISTS } from '../lib/blocklists'
import { hostnameOf, parseFilter } from '../lib/engine'
import { useApp } from '../lib/store'
import { CardHead, PageHead, Switch, useToast } from '../components/ui'

export default function FilterLists() {
  const {
    state,
    toggleList,
    addCustomRule,
    removeCustomRule,
    addAllow,
    removeAllow,
    activeListCount,
  } = useApp()

  const [ruleDraft, setRuleDraft] = useState('')
  const [allowDraft, setAllowDraft] = useState('')
  const [ruleError, setRuleError] = useState('')
  const [allowError, setAllowError] = useState('')
  const toast = useToast()

  function submitRule(event) {
    event.preventDefault()
    const value = ruleDraft.trim()
    if (!value) return
    if (state.customRules.includes(value)) {
      setRuleError('That rule is already in your list')
      return
    }
    const parsed = parseFilter(value, 'custom')
    if (parsed.kind === 'invalid') {
      setRuleError(parsed.note || 'Luma could not parse this rule')
      return
    }
    addCustomRule(value)
    setRuleDraft('')
    setRuleError('')
    toast.show(parsed.kind === 'cosmetic' ? 'Element hiding rule added' : parsed.exception ? 'Allow rule added' : 'Block rule added')
  }

  function submitAllow(event) {
    event.preventDefault()
    const host = hostnameOf(allowDraft)
    if (!host) {
      setAllowError('Enter a domain, for example news.example.com')
      return
    }
    if (state.allowlist.includes(host)) {
      setAllowError('That site is already allowlisted')
      return
    }
    addAllow(host)
    setAllowDraft('')
    setAllowError('')
    toast.show(host + ' allowlisted')
  }

  return (
    <>
      <PageHead
        eyebrow="Protection"
        title="Filter lists"
        lede="Lists decide what Luma blocks. Turn on more for a quieter web, or write your own rules."
      >
        <span className="badge plain">
          <ShieldCheck />
          {activeListCount} active
        </span>
      </PageHead>

      <section className="grid-2" style={{ alignItems: 'stretch' }}>
        {FILTER_LISTS.map((list) => {
          const on = Boolean(state.lists[list.id])
          return (
            <div className="list-card" key={list.id} data-on={on ? 'true' : 'false'}>
              <div className="list-top">
                <div className="grow">
                  <h3>
                    {list.name}
                    <span className="badge plain">{list.category}</span>
                    {list.recommended ? <span className="badge accent">Recommended</span> : null}
                  </h3>
                  <p>{list.description}</p>
                </div>
                <Switch on={on} onChange={() => toggleList(list.id)} label={'Toggle ' + list.name} />
              </div>
              <div className="list-meta">
                <span>Updated weekly</span>
              </div>
            </div>
          )
        })}
      </section>

      <section className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <CardHead
            title="Your custom rules"
            sub="Matched on every page you visit"
          />
          <form className="inline-form" onSubmit={submitRule}>
            <div className="field grow">
              <label htmlFor="rule">Add a rule</label>
              <input
                id="rule"
                className="input"
                placeholder="ads.example.com"
                value={ruleDraft}
                onChange={(event) => {
                  setRuleDraft(event.target.value)
                  setRuleError('')
                }}
              />
            </div>
            <button className="btn primary" type="submit">
              <Plus />
              Add rule
            </button>
          </form>
          {ruleError ? <p className="hint" style={{ color: 'var(--accent-deep)', marginTop: 8 }}>{ruleError}</p> : null}

          <div className="stack" style={{ gap: 8, marginTop: 14 }}>
            {state.customRules.map((rule) => {
              const parsed = parseFilter(rule, 'custom')
              const label =
                parsed.kind === 'cosmetic' ? 'Hides' : parsed.exception ? 'Allows' : 'Blocks'
              return (
                <div className="rule-row" key={rule}>
                  <span className={'badge ' + (parsed.exception ? 'good' : 'accent')}>{label}</span>
                  <code>{rule}</code>
                  <button
                    className="icon-btn"
                    type="button"
                    aria-label={'Remove rule ' + rule}
                    onClick={() => {
                      removeCustomRule(rule)
                      toast.show('Rule removed')
                    }}
                  >
                    <Trash2 />
                  </button>
                </div>
              )
            })}
            {!state.customRules.length ? <div className="empty">No custom rules yet.</div> : null}
          </div>
        </div>

        <div className="card">
          <CardHead
            title="Allowlist"
            sub="Sites where Luma stays out of the way"
          />
          <form className="inline-form" onSubmit={submitAllow}>
            <div className="field grow">
              <label htmlFor="allow">Allow a site</label>
              <input
                id="allow"
                className="input"
                placeholder="news.example.com"
                value={allowDraft}
                onChange={(event) => {
                  setAllowDraft(event.target.value)
                  setAllowError('')
                }}
              />
            </div>
            <button className="btn" type="submit">
              <Plus />
              Allow
            </button>
          </form>
          {allowError ? <p className="hint" style={{ color: 'var(--accent-deep)', marginTop: 8 }}>{allowError}</p> : null}

          <div className="chips" style={{ marginTop: 14 }}>
            {state.allowlist.map((host) => (
              <span className="chip" key={host}>
                {host}
                <button
                  type="button"
                  aria-label={'Remove ' + host + ' from allowlist'}
                  onClick={() => {
                    removeAllow(host)
                    toast.show(host + ' removed')
                  }}
                >
                  <X />
                </button>
              </span>
            ))}
            {!state.allowlist.length ? <div className="empty">Nothing allowlisted.</div> : null}
          </div>

          <p className="footer-note" style={{ marginTop: 12 }}>
            <Info size={12} style={{ verticalAlign: '-2px', marginRight: 4 }} />
            Allowlisted sites still hide the ads Luma can reach, but no requests are blocked there.
          </p>
        </div>
      </section>

      {toast.node}
    </>
  )
}
