import { BookOpen, Plus, Trash2 } from 'lucide-react'
import { CardHead } from '../ui'
import { useApp } from '../../lib/useApp'

/**
 * Single-purpose rules written in plain language so nobody needs to learn
 * filter syntax to quiet one specific annoyance.
 */
const PRESETS = [
  {
    id: 'reddit-promoted',
    label: 'Promoted posts on Reddit',
    site: 'reddit.com',
    text: 'Removes the sponsored posts that appear in your feed.',
    rule: 'reddit.com##shreddit-ad-post',
  },
  {
    id: 'youtube-promoted',
    label: 'Promoted videos on YouTube',
    site: 'youtube.com',
    text: 'Hides the paid video suggestions below a player.',
    rule: 'youtube.com##ytd-promoted-sparkles-web-renderer',
  },
  {
    id: 'amazon-sponsored',
    label: 'Sponsored products on Amazon',
    site: 'amazon.com',
    text: 'Hides the sponsored slots that sit between search results.',
    rule: 'amazon.com##[data-component-type="sp-sponsored-result"]',
  },
  {
    id: 'linkedin-sponsored',
    label: 'Sponsored posts on LinkedIn',
    site: 'linkedin.com',
    text: 'Clears the promoted entries out of your feed.',
    rule: 'linkedin.com##.feed-shared-update-v2--sponsored',
  },
  {
    id: 'x-promoted',
    label: 'Promoted posts on X',
    site: 'x.com',
    text: 'Hides the promoted posts that interrupt the timeline.',
    rule: 'x.com##[data-testid="placementTracking"]',
  },
  {
    id: 'promoted-cards',
    label: 'Promoted cards anywhere',
    site: 'Every site',
    text: 'Hides blocks marked as promoted or sponsored by the page itself.',
    rule: '##.promoted-post',
  },
  {
    id: 'sticky-cta',
    label: 'Sticky subscribe bars',
    site: 'Every site',
    text: 'Removes the bar that follows you down the page asking you to subscribe.',
    rule: '##.sticky-cta',
  },
  {
    id: 'chat-bubble',
    label: 'Support chat bubbles',
    site: 'Every site',
    text: 'Hides the floating chat button that covers the corner of the page.',
    rule: '##.chat-widget',
  },
]

export default function RuleLibrary() {
  const { state, addCustomRule, removeCustomRule } = useApp()

  return (
    <div className="stack">
      <div className="card">
        <CardHead
          title="Add a rule"
          sub="One click, one annoyance gone — no filter syntax to learn"
        >
          <span className="badge plain">
            <BookOpen />
            {PRESETS.length} ready
          </span>
        </CardHead>
        <div className="grid-2">
          {PRESETS.map((preset) => {
            const added = state.customRules.includes(preset.rule)
            return (
              <div className="note" key={preset.id}>
                <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{preset.label}</div>
                    <div className="small muted">{preset.site}</div>
                  </div>
                  {added ? (
                    <button
                      type="button"
                      className="btn sm ghost"
                      onClick={() => removeCustomRule(preset.rule)}
                    >
                      <Trash2 />
                      Remove
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn sm"
                      onClick={() => addCustomRule(preset.rule)}
                    >
                      <Plus />
                      Add
                    </button>
                  )}
                </div>
                <p className="small muted" style={{ marginTop: 8 }}>
                  {preset.text}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      <p className="footer-note">
        Added rules appear on Protection with the rest of your setup and sync with your account.
      </p>
    </div>
  )
}
