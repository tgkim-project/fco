import { formatMatchDate } from '../../lib/matchFormat.ts'
import type { MaxDivision, UserBasic } from '../../lib/nexon/types.ts'

// 볼타 매치 종류(204 이상)는 볼타 등급표를 쓴다
const isVolta = (matchType: number) => matchType >= 200

interface Props {
  basic: UserBasic
  maxDivisions: MaxDivision[]
  matchTypeNames: Map<number, string>
  divisionNames: Map<number, string>
  voltaDivisionNames: Map<number, string>
}

export default function UserSummary({ basic, maxDivisions, matchTypeNames, divisionNames, voltaDivisionNames }: Props) {
  return (
    <div className="panel" aria-label="유저 정보">
      <div className="row">
        <strong className="nickname">{basic.nickname}</strong>
        <span className="muted">Lv.{basic.level}</span>
      </div>
      {maxDivisions.length > 0 ? (
        <ul className="plain-list">
          {maxDivisions.map((d) => {
            const names = isVolta(d.matchType) ? voltaDivisionNames : divisionNames
            return (
              <li key={d.matchType}>
                <span className="muted">{matchTypeNames.get(d.matchType) ?? `매치 ${d.matchType}`} 최고 등급</span>{' '}
                <strong>{names.get(d.division) ?? d.division}</strong>{' '}
                <span className="muted small">({formatMatchDate(d.achievementDate)})</span>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="muted small">최고 등급 기록이 없습니다.</p>
      )}
    </div>
  )
}
