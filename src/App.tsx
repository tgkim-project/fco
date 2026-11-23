import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.tsx'
import GuidePage from './pages/GuidePage.tsx'
import HomePage from './pages/HomePage.tsx'
import MatchPage from './pages/MatchPage.tsx'
import PlayersPage from './pages/PlayersPage.tsx'
import SettingsPage from './pages/SettingsPage.tsx'
import SquadPage from './pages/SquadPage.tsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="match" element={<MatchPage />} />
        <Route path="players" element={<PlayersPage />} />
        <Route path="squad" element={<SquadPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="guide" element={<GuidePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
