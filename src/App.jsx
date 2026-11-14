import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Diagnostics from './pages/Diagnostics'
import Protection from './pages/Protection'
import { useAuth } from './lib/auth'

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
        {/* Old per-tool pages now live inside Protection. */}
        <Route path="/lists" element={<Navigate to="/protection?view=lists" replace />} />
        <Route path="/lab" element={<Navigate to="/protection?view=lab" replace />} />
        <Route path="/inspector" element={<Navigate to="/protection?view=inspector" replace />} />
        {/* Internal console: reachable by URL only, never linked from the app. */}
        <Route path="/diagnostics" element={<Diagnostics />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
