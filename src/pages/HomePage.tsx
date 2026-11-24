import { Link } from 'react-router-dom'
import KeyRequiredNotice from '../components/KeyRequiredNotice.tsx'
import { useApiKey } from '../hooks/useApiKey.ts'

const FEATURES = [
  { to: '/match', title: '전적 검색', desc: '최근 경기, 승률·평균 기록, 자주 쓴 선수와 랭커 비교, 자주 만난 상대' },
  { to: '/trade', title: '내 거래 기록', desc: '이적시장에서 구매·판매한 선수와 가격(BP)' },
]

export default function HomePage() {
  const apiKey = useApiKey()
  return (
    <section className="page">
      <h1>FC온라인 도우미</h1>
      <p className="muted">서버 없이 내 기기에서만 동작합니다. 넥슨과 무관한 비공식 앱입니다.</p>
      <ul className="card-list">
        {FEATURES.map((f) => (
          <li key={f.to}>
            <Link to={f.to} className="card">
              <strong>{f.title}</strong>
              <span className="muted">{f.desc}</span>
            </Link>
          </li>
        ))}
      </ul>
      {apiKey ? (
        <p className="muted">
          API 키 등록됨 · <Link to="/settings">설정에서 관리</Link>
        </p>
      ) : (
        <KeyRequiredNotice />
      )}
      <p className="muted small">Data based on NEXON Open API</p>
    </section>
  )
}
