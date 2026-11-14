import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Account from './pages/Account'
import Activity from './pages/Activity'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Diagnostics from './pages/Diagnostics'
import Protection from './pages/Protection'
import Owner from './pages/Owner'
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
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="/protection" element={<Protection />} />
        <Route path="/activity" element={<Activity />} />
        <Route path="/account" element={<Account />} />
        {/* Old per-tool pages now live inside Protection. */}
        <Route path="/lists" element={<Navigate to="/protection?view=lists" replace />} />
        <Route path="/lab" element={<Navigate to="/protection?view=lab" replace />} />
        <Route path="/inspector" element={<Navigate to="/protection?view=inspector" replace />} />
        {/* Internal console: reachable by URL only, never linked from the app. */}
        <Route path="/diagnostics" element={<Diagnostics />} />
        {/* Owner console: only owner accounts can read or erase accounts. */}
        <Route path="/owner" element={<Owner />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
