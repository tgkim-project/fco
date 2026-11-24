import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.tsx'
import GuidePage from './pages/GuidePage.tsx'
import HomePage from './pages/HomePage.tsx'
import MatchPage from './pages/MatchPage.tsx'
import SettingsPage from './pages/SettingsPage.tsx'
import TradePage from './pages/TradePage.tsx'
import WatchPage from './pages/WatchPage.tsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="match" element={<MatchPage />} />
        <Route path="watch" element={<WatchPage />} />
        <Route path="trade" element={<TradePage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="guide" element={<GuidePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
