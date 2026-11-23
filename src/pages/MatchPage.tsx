import KeyRequiredNotice from '../components/KeyRequiredNotice.tsx'
import { useApiKey } from '../hooks/useApiKey.ts'

export default function MatchPage() {
  const apiKey = useApiKey()
  return (
    <section className="page">
      <h1>전적 검색</h1>
      {apiKey ? (
        <p className="muted">닉네임으로 등급과 최근 경기를 확인합니다. (3~4단계에서 구현)</p>
      ) : (
        <KeyRequiredNotice />
      )}
    </section>
  )
}
