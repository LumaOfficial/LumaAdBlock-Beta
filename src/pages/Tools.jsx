import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowRight, Wrench } from 'lucide-react'
import { PageHead } from '../components/ui'
import { TOOLS, toolById } from '../components/tools/registry'

export default function Tools() {
  const { view } = useParams()
  const tool = toolById(view)

  // An address that names no tool goes back to the list.
  if (view && !tool) return <Navigate to="/tools" replace />

  if (!tool) {
    return (
      <>
        <PageHead
          eyebrow="Tools"
          title="Everything to check the work."
          lede="Look at what Luma does, test it against your own setup, and tidy the rules you keep. All of it runs on this device."
        >
          <span className="badge plain">
            <Wrench />
            {TOOLS.length} tools
          </span>
        </PageHead>

        <section className="grid-3">
          {TOOLS.map((item) => {
            const Icon = item.icon
            return (
              <Link key={item.id} to={'/tools/' + item.id} className="card action-tile">
                <span className="feed-icon">
                  <Icon />
                </span>
                <div className="grow">
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{item.label}</div>
                  <div className="small muted">{item.blurb}</div>
                </div>
                <ArrowRight width={15} height={15} />
              </Link>
            )
          })}
        </section>

        <p className="footer-note">Nothing here leaves your device unless you ask it to.</p>
      </>
    )
  }

  const Panel = tool.Panel

  return (
    <>
      <PageHead eyebrow="Tools" title={tool.title} lede={tool.lede}>
        <Link to="/tools" className="btn sm ghost">
          All tools
          <ArrowRight />
        </Link>
      </PageHead>

      <Panel />
    </>
  )
}
