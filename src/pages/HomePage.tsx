import { Link } from 'react-router-dom'

const FEATURES = [
  { to: '/match', title: '전적 검색', desc: '닉네임으로 등급과 최근 경기 확인' },
  { to: '/players', title: '선수 검색', desc: '이름·시즌으로 선수 찾기' },
  { to: '/squad', title: '스쿼드 메이커', desc: '포메이션 짜고 저장·공유' },
]

export default function HomePage() {
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
      <p className="muted">
        전적 검색을 쓰려면 <Link to="/guide">API 키 발급 가이드</Link>를 참고해 키를 등록하세요.
      </p>
    </section>
  )
}
