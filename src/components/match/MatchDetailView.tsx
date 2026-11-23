import { useMemo } from 'react'
import { useMeta } from '../../hooks/useMeta.ts'
import { formatGoalTime, percent, rating } from '../../lib/matchFormat.ts'
import { splitMatchSides } from '../../lib/nexon/fconline.ts'
import { classOfSpid, toLookup } from '../../lib/nexon/meta.ts'
import type { MatchDetail, MatchInfo } from '../../lib/nexon/types.ts'

interface Props {
  detail: MatchDetail
  ouid: string
}

/** spposition 28 = 교체 대기(SUB) → 출전 선수 목록에서 뒤로 */
const SUB_POSITION = 28

export default function MatchDetailView({ detail, ouid }: Props) {
  const { me, opponent } = splitMatchSides(detail, ouid)
  const spid = useMeta('spid')
  const positions = useMeta('spposition')
  const classes = useMeta('class')

  const names = useMemo(() => (spid.data ? toLookup(spid.data, (p) => p.id, (p) => p.name) : null), [spid.data])
  const positionNames = useMemo(
    () => (positions.data ? toLookup(positions.data, (p) => p.spposition, (p) => p.desc) : null),
    [positions.data],
  )
  const classNames = useMemo(
    () => (classes.data ? toLookup(classes.data, (c) => c.class, (c) => c.className.replace(/\s*\(.*\)$/, '')) : null),
    [classes.data],
  )

  const playerName = (id: number) => names?.get(id) ?? (spid.loading ? '…' : '알 수 없는 선수')

  const goals = [me, opponent]
    .flatMap((side) =>
      (side?.shootDetail ?? [])
        .filter((s) => s.result === 3)
        .map((s) => ({ ...s, side: side === me ? 'me' : 'opponent' })),
    )
    .sort((a, b) => a.goalTime - b.goalTime)

  const statRows: Array<[string, (info: MatchInfo) => string]> = [
    ['점유율', (i) => `${i.matchDetail.possession}%`],
    ['슈팅 (유효)', (i) => `${i.shoot.shootTotal} (${i.shoot.effectiveShootTotal})`],
    ['패스 성공률', (i) => percent(i.pass.passSuccess, i.pass.passTry)],
    ['태클 성공', (i) => `${i.defence.tackleSuccess}/${i.defence.tackleTry}`],
    ['코너킥', (i) => String(i.matchDetail.cornerKick)],
    ['파울', (i) => String(i.matchDetail.foul)],
    ['경기 평점', (i) => rating(i.matchDetail.averageRating)],
  ]

  return (
    <div className="match-detail">
      {!opponent && <p className="muted small">상대가 먼저 나가 상대 기록이 없습니다.</p>}

      <table className="stat-table">
        <thead>
          <tr>
            <th>{me?.nickname ?? '나'}</th>
            <th />
            <th>{opponent?.nickname ?? '상대'}</th>
          </tr>
        </thead>
        <tbody>
          {statRows.map(([label, get]) => (
            <tr key={label}>
              <td>{me ? get(me) : '-'}</td>
              <th scope="row">{label}</th>
              <td>{opponent ? get(opponent) : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {goals.length > 0 && (
        <>
          <h3>득점</h3>
          <ul className="plain-list">
            {goals.map((g, i) => (
              <li key={i} className={g.side}>
                {formatGoalTime(g.goalTime)} {playerName(g.spId)}
                {g.assist && g.assistSpId ? <span className="muted small"> (도움 {playerName(g.assistSpId)})</span> : null}
              </li>
            ))}
          </ul>
        </>
      )}

      {[me, opponent].map((side) =>
        side ? (
          <div key={side.ouid}>
            <h3>{side.nickname} 출전 선수</h3>
            <table className="player-table">
              <thead>
                <tr>
                  <th>포지션</th>
                  <th>선수</th>
                  <th>평점</th>
                  <th>골</th>
                  <th>도움</th>
                </tr>
              </thead>
              <tbody>
                {[...side.player]
                  .sort((a, b) => Number(a.spPosition === SUB_POSITION) - Number(b.spPosition === SUB_POSITION))
                  .map((p) => (
                    <tr key={`${p.spId}-${p.spPosition}`}>
                      <td>{positionNames?.get(p.spPosition) ?? p.spPosition}</td>
                      <td>
                        {playerName(p.spId)}{' '}
                        <span className="muted small">
                          {classNames?.get(classOfSpid(p.spId)) ?? ''} +{p.spGrade}
                        </span>
                      </td>
                      <td>{rating(p.status.spRating)}</td>
                      <td>{p.status.goal || ''}</td>
                      <td>{p.status.assist || ''}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : null,
      )}
      {spid.error ? <p className="muted small">선수 이름 목록을 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.</p> : null}
    </div>
  )
}
