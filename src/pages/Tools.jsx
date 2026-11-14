import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { FlaskConical, Search } from 'lucide-react'
import InspectorPanel from '../components/InspectorPanel'
import LabPanel from '../components/LabPanel'
import { PageHead } from '../components/ui'

// Things you use to look at protection working, kept apart from the settings
// that decide what gets blocked.
const VIEWS = [
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

export default function Tools() {
  const { view: requested } = useParams()
  const navigate = useNavigate()
  const view = VIEWS.find((item) => item.id === requested)

  if (!view) return <Navigate to="/tools/lab" replace />
  const { Panel } = view

  return (
    <>
      <PageHead eyebrow="Tools" title={view.title} lede={view.lede} />

      <div className="view-tabs" role="tablist" aria-label="Tools">
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
              onClick={() => navigate('/tools/' + item.id, { replace: true })}
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
