import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowRight, Wrench } from 'lucide-react'
import { PageHead } from '../components/ui'
import { TOOLS, toolById } from '../components/tools/registry'

export default function Tools() {
  const { view } = useParams()
  const tool = toolById(view)
  const [query, setQuery] = useState('')

  // A few tools live on their own (sidebar shortcut) instead of the grid.
  const hubTools = TOOLS.filter((item) => !item.hiddenFromHub)

  // An address that names no tool goes back to the list.
  if (view && !tool) return <Navigate to="/tools" replace />

  if (!tool) {
    const needle = query.trim().toLowerCase()
    const matches = needle
      ? hubTools.filter((item) => (item.label + ' ' + item.blurb).toLowerCase().includes(needle))
      : hubTools

    // Grouped the way they are written in the registry, so a long catalogue
    // still reads like a list of subjects rather than a wall of cards.
    const groups = []
    for (const item of matches) {
      const name = item.section || 'Everyday'
      let group = groups.find((entry) => entry.name === name)
      if (!group) {
        group = { name, tools: [] }
        groups.push(group)
      }
      group.tools.push(item)
    }

    return (
      <>
        <PageHead
          eyebrow="Tools"
          title="Everything to check the work."
          lede="Look at what Luma does, test it against your own setup, and tidy the rules you keep. All of it runs on this device."
        >
          <span className="badge plain">
            <Wrench />
            {hubTools.length} tools
          </span>
        </PageHead>

        <div className="field" style={{ maxWidth: 360, marginBottom: 6 }}>
          <label htmlFor="tool-search">Find a tool</label>
          <input
            id="tool-search"
            className="input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search a service or a task"
            spellCheck="false"
          />
        </div>

        {!matches.length ? (
          <p className="hint" style={{ marginTop: 12 }}>
            No tools match that yet.
          </p>
        ) : null}

        {groups.map((group) => (
          <div key={group.name}>
            <div className="eyebrow" style={{ margin: '20px 0 10px' }}>
              {group.name} · {group.tools.length}
            </div>
            <section className="grid-3">
              {group.tools.map((item) => {
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
          </div>
        ))}

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
