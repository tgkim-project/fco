import { describe, expect, it } from 'vitest'
import { CLASS_RELEASE_DATES } from '../data/classReleaseDates.ts'
import { classReleaseRank, sortClassesByRelease } from './classOrder.ts'
import { buildPlayerIndex, normalizeName, searchPlayers, toChosung } from './playerSearch.ts'

describe('sortClassesByRelease', () => {
  const cls = (id: number) => ({ class: id, className: `C${id}`, classImg: '' })

  it('출시일 최신순, 같은 날은 API 순서, 모르는 클래스는 맨 뒤', () => {
    const classes = [cls(1), cls(2), cls(3), cls(4), cls(5)]
    const dates = { 1: '2020-01-01', 2: null, 3: '2024-05-01', 4: '2024-05-01', 5: '2022-03-01' }
    expect(sortClassesByRelease(classes, dates).map((c) => c.class)).toEqual([3, 4, 5, 1, 2])
    expect(classReleaseRank(classes, dates).get(3)).toBe(0)
  })

  it('실제 출시일 표: 26UP·26 LIVE가 17 LIVE보다 앞', () => {
    const order = sortClassesByRelease([cls(317), cls(878), cls(300)]).map((c) => c.class)
    expect(order.indexOf(878)).toBeLessThan(order.indexOf(317))
    expect(order.indexOf(300)).toBeLessThan(order.indexOf(317))
    expect(Object.values(CLASS_RELEASE_DATES).every((d) => d === null || /^\d{4}-\d{2}-\d{2}$/.test(d))).toBe(true)
  })
})

const SPIDS = [
  { id: 101000007, name: '손흥민' },
  { id: 300000007, name: '손흥민' },
  { id: 300000008, name: '손준호' },
  { id: 300000009, name: '김민재' },
  { id: 101000010, name: '흥민손' },
  { id: 300000011, name: 'Son' },
]

describe('toChosung / normalizeName', () => {
  it('한글을 초성으로 바꾸고 나머지는 둔다', () => {
    expect(toChosung('손흥민')).toBe('ㅅㅎㅁ')
    expect(toChosung('김A민')).toBe('ㄱAㅁ')
  })

  it('공백·점·대소문자를 무시한다', () => {
    expect(normalizeName(' De Bruyne. ')).toBe('debruyne')
  })
})

describe('buildPlayerIndex', () => {
  it('같은 pid의 카드를 한 선수로 묶고 클래스 번호 내림차순으로 정렬한다', () => {
    const index = buildPlayerIndex(SPIDS)
    const son = index.find((g) => g.pid === 7)
    expect(son?.spids).toEqual([300000007, 101000007])
    expect(index).toHaveLength(5)
  })
})

describe('searchPlayers', () => {
  const index = buildPlayerIndex(SPIDS)

  it('정확히 일치 → 앞부분 일치 → 포함 순, 같으면 카드가 많은 선수를 앞에', () => {
    expect(searchPlayers(index, '손').map((g) => g.name)).toEqual(['손흥민', '손준호', '흥민손'])
    expect(searchPlayers(index, '손흥민').map((g) => g.name)).toEqual(['손흥민'])
  })

  it('자음만 입력하면 초성으로 찾는다', () => {
    expect(searchPlayers(index, 'ㅅㅎㅁ').map((g) => g.name)).toEqual(['손흥민'])
    expect(searchPlayers(index, 'ㄱㅁ').map((g) => g.name)).toEqual(['김민재'])
  })

  it('영문은 대소문자를 무시한다', () => {
    expect(searchPlayers(index, 'SON').map((g) => g.name)).toEqual(['Son'])
  })

  it('클래스 필터는 그 클래스 카드가 있는 선수만 남긴다', () => {
    expect(searchPlayers(index, '손', { classId: 101 }).map((g) => g.name)).toEqual(['손흥민', '흥민손'])
  })

  it('검색어 없이 클래스만 고르면 그 클래스 선수를 이름순으로', () => {
    expect(searchPlayers(index, '', { classId: 101 }).map((g) => g.name)).toEqual(['손흥민', '흥민손'])
    expect(searchPlayers(index, '')).toEqual([])
  })

  it('limit 만큼만 돌려준다', () => {
    expect(searchPlayers(index, '손', { limit: 2 })).toHaveLength(2)
  })
})
