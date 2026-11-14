import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Diagnostics from './pages/Diagnostics'
import FilterLists from './pages/FilterLists'
import Lab from './pages/Lab'
import Inspector from './pages/Inspector'
import { useAuth } from './lib/auth'

export default function App() {
  const { user } = useAuth()

  // Nothing behind the dashboard is reachable until the device has an account.
  if (!user) return <Auth />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="/lists" element={<FilterLists />} />
        <Route path="/lab" element={<Lab />} />
        <Route path="/inspector" element={<Inspector />} />
        {/* Internal console: reachable by URL only, never linked from the app. */}
        <Route path="/diagnostics" element={<Diagnostics />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
