import { useCallback, useEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'

export function Switch({ on, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label || 'Toggle'}
      className="switch"
      data-on={on ? 'true' : 'false'}
      onClick={() => onChange(!on)}
    />
  )
}

export function PageHead({ eyebrow, title, lede, children }) {
  return (
    <div className="page-head">
      <div className="grow">
        {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
        <h1 className="display" style={{ marginTop: eyebrow ? 6 : 0 }}>
          {title}
        </h1>
        {lede ? <p className="lede">{lede}</p> : null}
      </div>
      {children ? <div className="row">{children}</div> : null}
    </div>
  )
}

export function CardHead({ title, sub, children }) {
  return (
    <div className="card-head">
      <div className="grow">
        <h3>{title}</h3>
        {sub ? <p>{sub}</p> : null}
      </div>
      {children}
    </div>
  )
}

export function useToast() {
  const [message, setMessage] = useState(null)
  const timer = useRef(0)
  const show = useCallback((text) => {
    setMessage(text)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setMessage(null), 2400)
  }, [])
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const node = message ? (
    <div className="toast" role="status">
      <Check />
      {message}
    </div>
  ) : null
  return { show, node }
}

export function Empty({ children }) {
  return <div className="empty">{children}</div>
}
