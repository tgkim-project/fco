import { Link } from 'react-router-dom'
import KeyRequiredNotice from '../components/KeyRequiredNotice.tsx'
import { useApiKey } from '../hooks/useApiKey.ts'

const FEATURES = [
  { to: '/match', title: '전적 검색', desc: '닉네임으로 등급과 최근 경기 확인' },
  { to: '/players', title: '선수 검색', desc: '이름·시즌으로 선수 찾기' },
  { to: '/squad', title: '스쿼드 메이커', desc: '포메이션 짜고 저장·공유' },
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
