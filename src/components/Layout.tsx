import { NavLink, Outlet } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/', label: '홈', end: true },
  { to: '/match', label: '전적' },
  { to: '/players', label: '선수' },
  { to: '/squad', label: '스쿼드' },
  { to: '/settings', label: '설정' },
]

export default function Layout() {
  return (
    <div className="app">
      <header className="app-header">
        <NavLink to="/" className="brand">
          fco
        </NavLink>
        <span className="badge">비공식</span>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
      <nav className="tab-bar" aria-label="주요 메뉴">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className="tab">
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
