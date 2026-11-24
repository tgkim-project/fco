import { useMemo, useState } from 'react'
import { useMeta } from '../../hooks/useMeta.ts'
import { percent, rating } from '../../lib/matchFormat.ts'
import { summarizeMatches } from '../../lib/matchStats.ts'
import { NexonApiError } from '../../lib/nexon/errors.ts'
import { getRankerStats } from '../../lib/nexon/fconline.ts'
import { toLookup } from '../../lib/nexon/meta.ts'
import type { MatchDetail, RankerStat } from '../../lib/nexon/types.ts'

interface Props {
  apiKey: string
  ouid: string
  matchType: number
  details: MatchDetail[]
}

const TOP_PLAYERS = 11
const TOP_OPPONENTS = 5

const fixed1 = (n: number) => n.toFixed(1)

export default function MatchSummary({ apiKey, ouid, matchType, details }: Props) {
  const stats = useMemo(() => summarizeMatches(details, ouid), [details, ouid])
  const spid = useMeta('spid')
  const positions = useMeta('spposition')
  const names = useMemo(() => (spid.data ? toLookup(spid.data, (p) => p.id, (p) => p.name) : null), [spid.data])
  const positionNames = useMemo(
    () => (positions.data ? toLookup(positions.data, (p) => p.spposition, (p) => p.desc) : null),
    [positions.data],
  )

  const [ranker, setRanker] = useState<Map<string, RankerStat> | null>(null)
  const [rankerLoading, setRankerLoading] = useState(false)
  const [rankerError, setRankerError] = useState<string | null>(null)

  if (stats.games === 0) return null

  const players = stats.players.slice(0, TOP_PLAYERS)
  const rivals = stats.opponents.filter((o) => o.games >= 2).slice(0, TOP_OPPONENTS)
  const nameOf = (id: number) => names?.get(id) ?? (spid.loading ? '…' : '알 수 없는 선수')

  async function compareWithRankers() {
    setRankerLoading(true)
    setRankerError(null)
    try {
      const result = await getRankerStats(
        { apiKey },
        matchType,
        players.map((p) => ({ id: p.spId, po: p.position })),
      )
      setRanker(new Map(result.map((r) => [`${r.spId}:${r.spPosition}`, r])))
    } catch (e) {
      setRankerError(e instanceof NexonApiError ? e.userMessage : '랭커 통계를 불러오지 못했습니다.')
    } finally {
      setRankerLoading(false)
    }
  }

  return (
    <div className="panel" aria-label="전적 요약">
      <strong>
        최근 {stats.games}경기 · {stats.win}승 {stats.draw}무 {stats.lose}패 (승률 {Math.round(stats.winRate * 100)}%)
      </strong>
      <dl className="stat-grid">
        <div>
          <dt>평균 득점</dt>
          <dd>{fixed1(stats.avgGoalsFor)}</dd>
        </div>
        <div>
          <dt>평균 실점</dt>
          <dd>{fixed1(stats.avgGoalsAgainst)}</dd>
        </div>
        <div>
          <dt>평균 점유율</dt>
          <dd>{Math.round(stats.avgPossession)}%</dd>
        </div>
        <div>
          <dt>패스 성공률</dt>
          <dd>{Math.round(stats.passRate * 100)}%</dd>
        </div>
        <div>
          <dt>평균 슈팅 (유효)</dt>
          <dd>
            {fixed1(stats.avgShots)} ({fixed1(stats.avgEffectiveShots)})
          </dd>
        </div>
      </dl>

      <h3>자주 쓴 선수</h3>
      <div className="table-scroll">
        <table className="player-table">
          <thead>
            <tr>
              <th>선수</th>
              <th>포지션</th>
              <th>출전</th>
              <th>골</th>
              <th>도움</th>
              <th>평점</th>
              {ranker && <th title="TOP 10,000 랭커가 같은 카드·포지션으로 뛴 경기당 평균">랭커 골/도움/패스</th>}
            </tr>
          </thead>
          <tbody>
            {players.map((p) => {
              const r = ranker?.get(`${p.spId}:${p.position}`)
              return (
                <tr key={p.spId}>
                  <td>{nameOf(p.spId)}</td>
                  <td>{positionNames?.get(p.position) ?? p.position}</td>
                  <td>{p.games}</td>
                  <td>{p.goals}</td>
                  <td>{p.assists}</td>
                  <td>{rating(p.avgRating)}</td>
                  {ranker && (
                    <td>
                      {r
                        ? `${r.status.goal.toFixed(2)} / ${r.status.assist.toFixed(2)} / ${percent(r.status.passSuccess, r.status.passTry)}`
                        : '기록 없음'}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {!ranker && (
        <button type="button" className="secondary" onClick={compareWithRankers} disabled={rankerLoading}>
          {rankerLoading ? '랭커 통계 불러오는 중…' : '랭커 평균과 비교'}
        </button>
      )}
      {ranker && (
        <p className="muted small">
          랭커 값은 TOP 10,000 랭커가 같은 카드·포지션으로 뛴 경기의 경기당 평균입니다. 내 골·도움은 위 경기들의 합계입니다.
        </p>
      )}
      {rankerError && (
        <p className="feedback error" role="alert">
          {rankerError}
        </p>
      )}

      {rivals.length > 0 && (
        <>
          <h3>자주 만난 상대</h3>
          <ul className="plain-list" aria-label="상대 전적">
            {rivals.map((o) => (
              <li key={o.ouid}>
                <strong>{o.nickname}</strong>{' '}
                <span className="muted">
                  {o.games}경기 {o.win}승 {o.draw}무 {o.lose}패 · 득실 {o.goalsFor}:{o.goalsAgainst}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="muted small">아래에서 "더 보기"로 경기를 더 불러오면 요약에도 반영됩니다.</p>
    </div>
  )
}
