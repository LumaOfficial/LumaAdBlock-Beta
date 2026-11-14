import { useSearchParams } from 'react-router-dom'
import { FlaskConical, ListFilter, Search, ShieldCheck } from 'lucide-react'
import FilterListsPanel from '../components/FilterListsPanel'
import InspectorPanel from '../components/InspectorPanel'
import LabPanel from '../components/LabPanel'
import { PageHead } from '../components/ui'
import { useApp } from '../lib/useApp'

const VIEWS = [
  {
    id: 'lists',
    label: 'Filter lists',
    icon: ListFilter,
    title: 'Filter lists',
    lede: 'Lists decide what Luma blocks. Turn on more for a quieter web, or write your own rules.',
    Panel: FilterListsPanel,
  },
  {
    id: 'lab',
    label: 'Test lab',
    icon: FlaskConical,
    title: 'See the engine work.',
    lede: 'Four simulated sites, one real filter engine. Luma screens every request and hides every ad slot using the rules you have enabled.',
    Panel: LabPanel,
  },
  {
    id: 'inspector',
    label: 'URL inspector',
    icon: Search,
    title: 'Why was that blocked?',
    lede: 'Paste any request and Luma will check it against your protection, then tell you what it would do.',
    Panel: InspectorPanel,
  },
]

export default function Protection() {
  const { activeListCount } = useApp()
  const [params, setParams] = useSearchParams()
  const requested = params.get('view')
  const view = VIEWS.find((item) => item.id === requested) || VIEWS[0]
  const { Panel } = view

  return (
    <>
      <PageHead eyebrow="Protection" title={view.title} lede={view.lede}>
        {view.id === 'lists' ? (
          <span className="badge plain">
            <ShieldCheck />
            {activeListCount} active
          </span>
        ) : null}
      </PageHead>

      <div className="view-tabs" role="tablist" aria-label="Protection tools">
        {VIEWS.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={item.id === view.id}
              data-active={item.id === view.id ? 'true' : 'false'}
              className="view-tab"
              onClick={() => setParams({ view: item.id }, { replace: true })}
            >
              <Icon />
              {item.label}
            </button>
          )
        })}
      </div>

      <Panel />
    </>
  )
}
