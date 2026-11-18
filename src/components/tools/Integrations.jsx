import { useState } from 'react'
import {
  AtSign,
  Briefcase,
  Check,
  Github,
  Inbox,
  Mail,
  MessageCircle,
  MessagesSquare,
  PlaySquare,
  Plug,
  Tv,
  Users,
} from 'lucide-react'
import { CardHead, Switch } from '../ui'
import { useApp } from '../../lib/useApp'
import { compileRules, cosmeticFor, hostMatches, screenRequest } from '../../lib/engine'
import { INTEGRATIONS } from '../../lib/integrations'

const ICONS = {
  Email: Mail,
  Code: Github,
  Chat: MessageCircle,
  Video: PlaySquare,
  Social: Users,
  Work: Briefcase,
}

const KIND_ICONS = { 'gmail': Inbox, 'discord': MessageCircle, 'slack': MessagesSquare, 'x': AtSign, 'twitch': Tv }

/** What Luma would clear on this platform with the protection turned on now. */
function coverage(platform, context) {
  const compiled = compileRules(platform.lines, 'integration:' + platform.id)
  const rules = [...context.rules, ...compiled]
  const { hide } = cosmeticFor(platform.site, rules)
  const hiding = new Set(hide.map((rule) => rule.selector))
  const cosmetic = compiled.filter(
    (rule) => rule.kind === 'cosmetic' && !rule.exception && hiding.has(rule.selector),
  ).length
  const network = (platform.checks || []).filter(
    (check) =>
      screenRequest(check, { ...context, rules, pageHost: platform.site }).blocked,
  ).length
  return {
    covered: cosmetic + network,
    total: compiled.filter((rule) => rule.kind === 'cosmetic').length + (platform.checks || []).length,
    paused: context.pausedSites.some((host) => hostMatches(platform.site, host)),
  }
}

/**
 * The platforms a person already uses, in one place. Connecting one turns on a
 * small pack of rules that clears that platform's ads while they browse it;
 * the check tells them exactly how much that covers today.
 */
export default function Integrations() {
  const { state, rules, protectionNow, connectIntegration, disconnectIntegration } = useApp()
  const [checks, setChecks] = useState({})
  const connected = state.integrations
  const allConnected = connected.length === INTEGRATIONS.length
  const placements = INTEGRATIONS.filter((item) => connected.includes(item.id)).reduce(
    (sum, item) => sum + item.removes.length,
    0,
  )

  const check = (platform) => {
    setChecks((previous) => ({
      ...previous,
      [platform.id]: coverage(platform, {
        rules,
        allowlist: state.allowlist,
        pausedSites: state.pausedSites,
        protection: protectionNow,
      }),
    }))
  }

  const verdict = (platform) => {
    const result = checks[platform.id]
    if (!result) return ''
    if (!protectionNow) return 'Protection is paused, so nothing is removed right now.'
    if (result.paused) return 'You paused this site, so Luma leaves it alone.'
    const verb = connected.includes(platform.id) ? 'cleared' : 'ready to clear'
    return `${result.covered} of ${result.total} placements ${verb} here.`
  }

  return (
    <div className="stack">
      <section className="card">
        <CardHead
          title="Your platforms"
          sub={`${connected.length} of ${INTEGRATIONS.length} connected`}
        >
          <span className="badge plain">
            <Plug />
            {connected.length ? `${placements} placements` : 'None yet'}
          </span>
        </CardHead>
        <p className="small muted" style={{ marginTop: -4 }}>
          Connect a platform and Luma clears its ads, sponsored posts and promos while you use its
          website. Everything happens in this browser; it never signs in to your accounts and nothing
          is sent anywhere.
        </p>
        <div className="row" style={{ gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
          <button
            type="button"
            className="btn"
            disabled={allConnected}
            onClick={() => INTEGRATIONS.forEach((item) => connectIntegration(item.id))}
          >
            <Plug />
            Clean up every platform
          </button>
          {connected.length ? (
            <button
              type="button"
              className="btn ghost"
              onClick={() => connected.forEach((id) => disconnectIntegration(id))}
            >
              Disconnect all
            </button>
          ) : null}
        </div>
      </section>

      <section className="grid-2" style={{ alignItems: 'start' }}>
        {INTEGRATIONS.map((platform) => {
          const Icon = KIND_ICONS[platform.id] || ICONS[platform.kind] || Plug
          const on = connected.includes(platform.id)
          return (
            <div key={platform.id} className="card">
              <CardHead title={platform.label} sub={platform.kind}>
                <Switch
                  on={on}
                  onChange={(next) =>
                    next ? connectIntegration(platform.id) : disconnectIntegration(platform.id)
                  }
                  label={'Clean up ' + platform.label}
                />
              </CardHead>
              <div className="row" style={{ alignItems: 'flex-start', gap: 10 }}>
                <span className="feed-icon">
                  <Icon />
                </span>
                <p className="small muted grow" style={{ margin: 0 }}>
                  {platform.blurb}
                </p>
              </div>

              <div className="stack" style={{ gap: 6, marginTop: 12 }}>
                {platform.removes.map((item) => (
                  <div key={item} className="row" style={{ gap: 8 }}>
                    <Check width={14} height={14} />
                    <span className="small">{item}</span>
                  </div>
                ))}
              </div>

              <div
                className="row"
                style={{ justifyContent: 'space-between', gap: 10, marginTop: 14, flexWrap: 'wrap' }}
              >
                <span className="badge plain">{on ? 'Connected' : 'Not connected'}</span>
                <button type="button" className="btn sm ghost" onClick={() => check(platform)}>
                  Check now
                </button>
              </div>

              {checks[platform.id] ? (
                <p className="hint" style={{ marginTop: 8 }}>
                  {verdict(platform)}
                </p>
              ) : null}
            </div>
          )
        })}
      </section>

      <p className="footer-note">
        Luma cleans each platform’s website, the only place a browser extension can see its ads.
        Desktop and mobile apps are not covered.
      </p>
    </div>
  )
}
