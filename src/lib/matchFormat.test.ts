import { describe, expect, it } from 'vitest'
import { formatGoalTime, parseApiDate, percent, rating } from './matchFormat.ts'
import { addRecentNickname, getRecentNicknames, removeRecentNickname } from './recentSearches.ts'

describe('matchFormat', () => {
  it('시간대 표기가 없는 API 날짜는 UTC로 본다', () => {
    expect(parseApiDate('2026-11-01T10:00:00').toISOString()).toBe('2026-11-01T10:00:00.000Z')
    expect(parseApiDate('2026-11-01T10:00:00Z').toISOString()).toBe('2026-11-01T10:00:00.000Z')
  })

  it('골 시간을 전·후반 구간에 맞춰 분으로 바꾼다', () => {
    expect(formatGoalTime(30)).toBe("1'")
    expect(formatGoalTime(600)).toBe("11'")
    expect(formatGoalTime(2 ** 24 + 600)).toBe("56'")
  })

  it('비율과 평점을 표시한다', () => {
    expect(percent(8, 10)).toBe('80%')
    expect(percent(0, 0)).toBe('-')
    expect(rating(7.25)).toBe('7.3')
    expect(rating(0)).toBe('-')
  })
})

describe('recentSearches', () => {
  it('최근 닉네임을 앞에 추가하고 중복을 없앤다', () => {
    addRecentNickname('a')
    addRecentNickname('b')
    expect(addRecentNickname(' a ')).toEqual(['a', 'b'])
    expect(removeRecentNickname('a')).toEqual(['b'])
    expect(getRecentNicknames()).toEqual(['b'])
  })

  it('최대 10개까지만 보관한다', () => {
    for (let i = 0; i < 12; i++) addRecentNickname(`n${i}`)
    expect(getRecentNicknames()).toHaveLength(10)
    expect(getRecentNicknames()[0]).toBe('n11')
  })
})
