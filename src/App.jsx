import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import FilterLists from './pages/FilterLists'
import Lab from './pages/Lab'
import Inspector from './pages/Inspector'
import Extension from './pages/Extension'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="/lists" element={<FilterLists />} />
        <Route path="/lab" element={<Lab />} />
        <Route path="/inspector" element={<Inspector />} />
        <Route path="/extension" element={<Extension />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
