import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  FlaskConical,
  Globe,
  ShieldOff,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import FakeSite from './FakeSite'
import { CardHead } from './ui'
import { DEMO_SITES } from '../lib/demoSites'
import { cosmeticFor, screenRequest } from '../lib/engine'
import { useApp } from '../lib/store'

/** A readable name for a demo selector, so checks never show raw CSS. */
function selectorLabel(selector) {
  const simple = selector.match(/^\.([a-z0-9-]+)$/i)
  if (!simple) return 'Page element'
  return simple[1]
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export default function LabPanel() {
  const { state, setProtection, rules, observe, protectionNow } = useApp()
  const [siteId, setSiteId] = useState(DEMO_SITES[0].id)
  const [checks, setChecks] = useState(null)
  const [hiddenCount, setHiddenCount] = useState(0)
  const siteRef = useRef(null)

  const site = DEMO_SITES.find((item) => item.id === siteId) || DEMO_SITES[0]

  const decisions = useMemo(
    () =>
      site.requests.map((request) => ({
        ...request,
        decision: screenRequest(request, {
          rules,
          allowlist: state.allowlist,
          protection: protectionNow,
          pageHost: site.host,
        }),
      })),
    [site, rules, state.allowlist, protectionNow],
  )

  const cosmetic = useMemo(() => cosmeticFor(site.host, rules), [rules, site.host])
  const blockedCount = decisions.filter((item) => item.decision.blocked).length

  // Every request the lab screens is an observation the engine can learn from.
  useEffect(() => {
    observe(
      decisions.map((item) => ({
        url: item.url,
        type: item.type,
        pageHost: site.host,
        blocked: item.decision.blocked,
      })),
    )
  }, [decisions, site.host, observe])

  useEffect(() => {
    setChecks(null)
    const root = siteRef.current
    if (!root) return
    root.querySelectorAll('[data-luma-hidden]').forEach((node) => node.removeAttribute('data-luma-hidden'))
    if (!protectionNow) {
      setHiddenCount(0)
      return
    }
    const touched = new Set()
    for (const rule of cosmetic.hide) {
      try {
        root.querySelectorAll(rule.selector).forEach((node) => {
          node.setAttribute('data-luma-hidden', 'true')
          touched.add(node)
        })
      } catch {
        /* a rule may use syntax this browser cannot compile */
      }
    }
    for (const rule of cosmetic.show) {
      try {
        root.querySelectorAll(rule.selector).forEach((node) => {
          node.removeAttribute('data-luma-hidden')
          touched.delete(node)
        })
      } catch {
        /* ignore */
      }
    }
    setHiddenCount(touched.size)
  }, [cosmetic, protectionNow, siteId])

  function runChecks() {
    const root = siteRef.current
    if (!root) return
    const results = []

    for (const item of decisions) {
      results.push({
        key: item.url,
        label: item.label,
        detail: item.expect === 'blocked' ? 'should be blocked' : 'should be allowed',
        ok: item.decision.blocked === (item.expect === 'blocked'),
      })
    }

    for (const selector of site.hide) {
      const nodes = Array.from(root.querySelectorAll(selector))
      results.push({
        key: 'hide:' + selector,
        label: selectorLabel(selector),
        detail: `${nodes.length} element${nodes.length === 1 ? '' : 's'} hidden`,
        ok:
          nodes.length > 0 &&
          nodes.every((node) => node.getAttribute('data-luma-hidden') === 'true'),
      })
    }

    for (const selector of site.keep) {
      const nodes = Array.from(root.querySelectorAll(selector))
      results.push({
        key: 'keep:' + selector,
        label: selectorLabel(selector),
        detail: 'should stay visible',
        ok:
          nodes.length > 0 &&
          nodes.every((node) => node.getAttribute('data-luma-hidden') !== 'true'),
      })
    }

    setChecks(results)
  }

  const passed = checks ? checks.filter((check) => check.ok).length : 0

  return (
    <>
      <div className="site-switch">
        {DEMO_SITES.map((item) => (
          <button
            key={item.id}
            type="button"
            className="site-pill"
            data-active={item.id === site.id ? 'true' : 'false'}
            onClick={() => setSiteId(item.id)}
          >
            {item.name}
          </button>
        ))}
      </div>

      <p className="small muted" style={{ marginTop: -8 }}>
        {site.blurb}
      </p>

      <section className="lab-grid">
        <div className="stack" style={{ gap: 14 }}>
          <div className="browser">
            <div className="browser-bar">
              <span className="browser-dots">
                <i />
                <i />
                <i />
              </span>
              <span className="browser-url">
                <Globe />
                {site.host}
              </span>
              <span className="browser-shield">
                <ShieldCheck />
                {protectionNow ? `${blockedCount} blocked` : 'paused'}
              </span>
            </div>
            <div className="browser-viewport" ref={siteRef}>
              <FakeSite id={site.id} />
            </div>
          </div>

          <div className="row" style={{ flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn"
              onClick={() => setProtection(!state.protection)}
            >
              {state.protection ? <ShieldCheck /> : <ShieldOff />}
              {state.protection ? 'Pause protection' : 'Resume protection'}
            </button>
            {state.protection && !protectionNow ? (
              <span className="badge warn">Quiet hours</span>
            ) : null}
            <span className="badge plain">
              {protectionNow ? hiddenCount : 0} ad elements hidden
            </span>
            <span className="badge plain">{blockedCount} of {decisions.length} requests blocked</span>
          </div>
        </div>

        <div className="stack" style={{ gap: 14 }}>
          <div className="card" style={{ padding: 18 }}>
            <CardHead title="Requests" sub="Live decisions from the filter engine" />
            <div className="request-table">
              {decisions.map((item) => (
                <div className="request-row" key={item.url} data-status={item.decision.status}>
                  <div className="req-main">
                    <div className="req-label">{item.label}</div>
                    <div className="req-url">
                      {item.decision.blocked ? 'Recognized ad or tracker' : 'Nothing to block'}
                    </div>
                  </div>
                  <span className={'req-state ' + (protectionNow ? item.decision.status : 'paused')}>
                    {protectionNow ? (item.decision.blocked ? 'blocked' : 'allowed') : 'paused'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 18 }}>
            <CardHead title="Checks" sub="What every request and ad slot should do">
              <button type="button" className="btn sm ghost" onClick={runChecks}>
                <FlaskConical />
                Run checks
              </button>
            </CardHead>
            {checks ? (
              <>
                <div className="verdict" data-ok={passed === checks.length ? 'true' : 'false'}>
                  {passed === checks.length ? <CheckCircle2 /> : <AlertTriangle />}
                  <span>
                    <strong>
                      {passed} / {checks.length}
                    </strong>{' '}
                    checks passed
                    {!protectionNow ? ' — protection is paused' : ''}
                  </span>
                </div>
                <div className="check-list" style={{ marginTop: 10 }}>
                  {checks.map((check) => (
                    <div className="check" data-ok={check.ok ? 'true' : 'false'} key={check.key}>
                      {check.ok ? <CheckCircle2 /> : <XCircle />}
                      <span className="grow">
                        <span style={{ fontWeight: 500 }}>{check.label}</span>
                        <br />
                        <span className="small muted">{check.detail}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="empty">
                Press <strong>Run checks</strong> to screen every request on this page and confirm each ad
                slot is hidden.
              </div>
            )}
          </div>

          <p className="footer-note">
            Every decision above comes from the protection you have enabled.
          </p>
        </div>
      </section>
    </>
  )
}
