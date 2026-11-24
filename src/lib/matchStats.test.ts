import { describe, expect, it } from 'vitest'
import { summarizeMatches } from './matchStats.ts'
import type { MatchDetail } from './nexon/types.ts'

function side(ouid: string, nickname: string, result: '승' | '무' | '패', goals: number, players: Array<[number, number, number, number]>) {
  return {
    ouid,
    nickname,
    matchDetail: { matchResult: result, possession: 60 },
    shoot: { shootTotal: 10, effectiveShootTotal: 5, goalTotalDisplay: goals },
    pass: { passTry: 100, passSuccess: 80 },
    // [spId, position, goal, rating]
    player: players.map(([spId, spPosition, goal, spRating]) => ({
      spId,
      spPosition,
      spGrade: 1,
      status: { goal, assist: 0, spRating },
    })),
  }
}

function match(id: string, me: ReturnType<typeof side>, opp?: ReturnType<typeof side>): MatchDetail {
  return { matchId: id, matchDate: '', matchType: 50, matchInfo: opp ? [opp, me] : [me] } as unknown as MatchDetail
}

describe('summarizeMatches', () => {
  const details = [
    match('1', side('ME', '나', '승', 3, [[101, 25, 2, 8], [102, 0, 0, 6]]), side('A', '상대A', '패', 1, [])),
    match('2', side('ME', '나', '패', 0, [[101, 25, 0, 6], [103, 28, 0, 0]]), side('A', '상대A', '승', 2, [])),
    match('3', side('ME', '나', '무', 1, [[101, 24, 1, 7]]), side('B', '상대B', '무', 1, [])),
    // 내 기록 없는 경기는 무시
    match('4', side('OTHER', '남', '승', 9, [])),
  ]
  const s = summarizeMatches(details, 'ME')

  it('승무패, 승률, 평균 기록을 계산한다', () => {
    expect(s.games).toBe(3)
    expect([s.win, s.draw, s.lose]).toEqual([1, 1, 1])
    expect(s.winRate).toBeCloseTo(1 / 3)
    expect(s.avgGoalsFor).toBeCloseTo(4 / 3)
    expect(s.avgGoalsAgainst).toBeCloseTo(4 / 3)
    expect(s.avgPossession).toBe(60)
    expect(s.passRate).toBeCloseTo(0.8)
  })

  it('선발 선수만 집계하고 가장 많이 뛴 포지션을 고른다', () => {
    const top = s.players[0]
    expect(top).toMatchObject({ spId: 101, games: 3, goals: 3, position: 25 })
    expect(top.avgRating).toBeCloseTo(7)
    expect(s.players.find((p) => p.spId === 103)).toBeUndefined()
  })

  it('상대별 전적을 묶는다', () => {
    expect(s.opponents[0]).toMatchObject({ nickname: '상대A', games: 2, win: 1, lose: 1, goalsFor: 3, goalsAgainst: 3 })
    expect(s.opponents[1]).toMatchObject({ nickname: '상대B', games: 1, draw: 1 })
  })
})
