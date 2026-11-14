import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { PRIVACY, TERMS } from '../lib/legal'

const DOCS = { terms: TERMS, privacy: PRIVACY }

function Block({ block }) {
  if (typeof block === 'string') return <p>{block}</p>
  if (block.sub) return <h4>{block.sub}</h4>
  return (
    <ul>
      {block.list.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}

/** Shows the Terms and Conditions and the Privacy Policy in one dialog. */
export default function LegalDialog({ initial = 'terms', onClose }) {
  const [tab, setTab] = useState(initial)
  const bodyRef = useRef(null)
  const doc = DOCS[tab]

  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [onClose])

  useEffect(() => {
    bodyRef.current?.scrollTo(0, 0)
  }, [tab])

  return (
    <div className="legal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="legal-dialog" role="dialog" aria-modal="true" aria-label="Terms and Privacy Policy">
        <div className="legal-head">
          <div className="auth-tabs legal-tabs" role="tablist" aria-label="Agreements">
            <button
              type="button"
              role="tab"
              className="auth-tab"
              aria-selected={tab === 'terms'}
              onClick={() => setTab('terms')}
            >
              Terms &amp; Conditions
            </button>
            <button
              type="button"
              role="tab"
              className="auth-tab"
              aria-selected={tab === 'privacy'}
              onClick={() => setTab('privacy')}
            >
              Privacy Policy
            </button>
          </div>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="legal-body" ref={bodyRef}>
          <h2>{doc.subtitle}</h2>
          <div className="legal-meta">
            {doc.meta.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
          {doc.intro ? <p className="legal-intro">{doc.intro}</p> : null}
          {doc.sections.map((section) => (
            <section key={section.title}>
              <h3>{section.title}</h3>
              {section.blocks.map((block, index) => (
                <Block key={index} block={block} />
              ))}
            </section>
          ))}
        </div>

        <div className="legal-foot">
          <button type="button" className="btn primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
