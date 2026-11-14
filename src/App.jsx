import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Account from './pages/Account'
import Activity from './pages/Activity'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Diagnostics from './pages/Diagnostics'
import Protection from './pages/Protection'
import Owner from './pages/Owner'
import Panel from './pages/Panel'
import Tools from './pages/Tools'
import { useAuth } from './lib/useAuth'

export default function App() {
  const { user, status } = useAuth()

  if (status === 'loading') {
    return (
      <div className="auth-shell">
        <span className="brand-mark" aria-label="Loading" />
      </div>
    )
  }

  // Nothing behind the dashboard is reachable until the device has an account.
  if (!user) return <Auth />

  return (
    <Routes>
      {/* The small browser panel, sized for a popup or Opera side panel. */}
      <Route path="/panel" element={<Panel />} />
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="/protection" element={<Protection />} />
        <Route path="/activity" element={<Activity />} />
        <Route path="/account" element={<Account />} />
        {/* Tools sit apart from the protection settings they inspect. */}
        <Route path="/tools" element={<Tools />} />
        <Route path="/tools/:view" element={<Tools />} />
        {/* Old addresses for the tools and the lists. */}
        <Route path="/lists" element={<Navigate to="/protection" replace />} />
        <Route path="/lab" element={<Navigate to="/tools/experiments" replace />} />
        <Route path="/tools/lab" element={<Navigate to="/tools/experiments" replace />} />
        <Route path="/inspector" element={<Navigate to="/tools/inspector" replace />} />
        {/* Internal console: reachable by URL only, never linked from the app. */}
        <Route path="/diagnostics" element={<Diagnostics />} />
        {/* Owner console: only owner accounts can read or erase accounts. */}
        <Route path="/owner" element={<Owner />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
