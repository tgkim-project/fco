import { Link } from 'react-router-dom'

/** API 키가 없을 때 키 등록·발급 가이드로 안내 */
export default function KeyRequiredNotice() {
  return (
    <div className="notice" role="status">
      <strong>API 키가 필요합니다</strong>
      <p>
        전적 검색은 NEXON Open API를 사용합니다. 내 API 키를 발급받아 등록해 주세요. 키는 이 기기에만
        저장됩니다.
      </p>
      <div className="row">
        <Link to="/settings" className="button">
          키 등록하기
        </Link>
        <Link to="/guide" className="button secondary">
          발급 방법 보기
        </Link>
      </div>
    </div>
  )
}
