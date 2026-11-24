import { splitMatchSides } from './nexon/fconline.ts'
import type { MatchDetail } from './nexon/types.ts'

/** spposition 28 = 교체 대기(SUB). 선발로 뛴 기록만 선수 통계에 넣는다 */
export const SUB_POSITION = 28

export interface PlayerUsage {
  spId: number
  /** 가장 많이 뛴 포지션 */
  position: number
  games: number
  goals: number
  assists: number
  /** 평점이 있는 경기의 평균 (없으면 0) */
  avgRating: number
}

export interface OpponentRecord {
  ouid: string
  nickname: string
  games: number
  win: number
  draw: number
  lose: number
  goalsFor: number
  goalsAgainst: number
}

export interface MatchSummaryStats {
  games: number
  win: number
  draw: number
  lose: number
  /** 0~1 */
  winRate: number
  avgGoalsFor: number
  avgGoalsAgainst: number
  avgPossession: number
  /** 0~1, 패스 시도가 없으면 0 */
  passRate: number
  avgShots: number
  avgEffectiveShots: number
  players: PlayerUsage[]
  opponents: OpponentRecord[]
}

/** 불러온 경기들로 요약 통계를 낸다. 내 기록이 없는 경기는 건너뛴다 */
export function summarizeMatches(details: MatchDetail[], ouid: string): MatchSummaryStats {
  let games = 0
  let win = 0
  let draw = 0
  let lose = 0
  let goalsFor = 0
  let goalsAgainst = 0
  let possession = 0
  let passTry = 0
  let passSuccess = 0
  let shots = 0
  let effectiveShots = 0

  const players = new Map<
    number,
    { games: number; goals: number; assists: number; ratingSum: number; rated: number; positions: Map<number, number> }
  >()
  const opponents = new Map<string, OpponentRecord>()

  for (const detail of details) {
    const { me, opponent } = splitMatchSides(detail, ouid)
    if (!me) continue
    games++
    const result = me.matchDetail.matchResult
    if (result === '승') win++
    else if (result === '무') draw++
    else lose++

    const gf = me.shoot.goalTotalDisplay
    const ga = opponent?.shoot.goalTotalDisplay ?? 0
    goalsFor += gf
    goalsAgainst += ga
    possession += me.matchDetail.possession
    passTry += me.pass.passTry
    passSuccess += me.pass.passSuccess
    shots += me.shoot.shootTotal
    effectiveShots += me.shoot.effectiveShootTotal

    for (const p of me.player) {
      if (p.spPosition === SUB_POSITION) continue
      const u = players.get(p.spId) ?? { games: 0, goals: 0, assists: 0, ratingSum: 0, rated: 0, positions: new Map() }
      u.games++
      u.goals += p.status.goal
      u.assists += p.status.assist
      if (p.status.spRating > 0) {
        u.ratingSum += p.status.spRating
        u.rated++
      }
      u.positions.set(p.spPosition, (u.positions.get(p.spPosition) ?? 0) + 1)
      players.set(p.spId, u)
    }

    if (opponent) {
      const o = opponents.get(opponent.ouid) ?? {
        ouid: opponent.ouid,
        nickname: opponent.nickname,
        games: 0,
        win: 0,
        draw: 0,
        lose: 0,
        goalsFor: 0,
        goalsAgainst: 0,
      }
      o.nickname = opponent.nickname
      o.games++
      if (result === '승') o.win++
      else if (result === '무') o.draw++
      else o.lose++
      o.goalsFor += gf
      o.goalsAgainst += ga
      opponents.set(opponent.ouid, o)
    }
  }

  const avg = (sum: number) => (games ? sum / games : 0)

  return {
    games,
    win,
    draw,
    lose,
    winRate: games ? win / games : 0,
    avgGoalsFor: avg(goalsFor),
    avgGoalsAgainst: avg(goalsAgainst),
    avgPossession: avg(possession),
    passRate: passTry ? passSuccess / passTry : 0,
    avgShots: avg(shots),
    avgEffectiveShots: avg(effectiveShots),
    players: [...players.entries()]
      .map(([spId, u]) => ({
        spId,
        position: [...u.positions.entries()].sort((a, b) => b[1] - a[1])[0][0],
        games: u.games,
        goals: u.goals,
        assists: u.assists,
        avgRating: u.rated ? u.ratingSum / u.rated : 0,
      }))
      .sort((a, b) => b.games - a.games || b.avgRating - a.avgRating),
    opponents: [...opponents.values()].sort((a, b) => b.games - a.games || a.nickname.localeCompare(b.nickname, 'ko')),
  }
}
