import { Navigate, useSearchParams } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import BlockStylePanel from '../components/BlockStylePanel'
import DetectionCard from '../components/DetectionCard'
import FilterListsPanel from '../components/FilterListsPanel'
import { PageHead } from '../components/ui'
import { useApp } from '../lib/useApp'

// Protection holds the settings that decide what gets blocked. The lab and the
// inspector live under Tools instead.
export default function Protection() {
  const { activeListCount } = useApp()
  const [params] = useSearchParams()
  const legacy = params.get('view')

  // Old links opened a tool inside Protection; send them to their own page.
  if (legacy === 'lab' || legacy === 'inspector') {
    return <Navigate to={'/tools/' + legacy} replace />
  }

  return (
    <>
      <PageHead
        eyebrow="Protection"
        title="What Luma blocks."
        lede="Filter lists, your own rules and the sites you trust. Change them here and every device signed in to your account follows."
      >
        <span className="badge plain">
          <ShieldCheck />
          {activeListCount} active
        </span>
      </PageHead>

      <FilterListsPanel />
      <BlockStylePanel />
      <DetectionCard />
    </>
  )
}
