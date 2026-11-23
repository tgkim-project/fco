import { describe, expect, it } from 'vitest'
import { FORMATIONS, getFormation } from './formations.ts'
import { decodeSquad, encodeSquad } from './shareCode.ts'
import { assignSlot, createSquad, loadSquads, normalizeSlots, saveSquads, swapSlots } from './squadStore.ts'

const empty = () => Array.from({ length: 11 }, () => null as number | null)

describe('formations', () => {
  it('모든 포메이션은 GK 포함 11자리이고 좌표가 경기장 안에 있다', () => {
    for (const f of FORMATIONS) {
      expect(f.slots, f.id).toHaveLength(11)
      expect(f.slots[0].label).toBe('GK')
      for (const s of f.slots) {
        expect(s.x).toBeGreaterThanOrEqual(0)
        expect(s.x).toBeLessThanOrEqual(100)
        expect(s.y).toBeGreaterThanOrEqual(0)
        expect(s.y).toBeLessThanOrEqual(100)
      }
    }
  })

  it('모르는 포메이션 id는 기본값으로', () => {
    expect(getFormation('nope').id).toBe(FORMATIONS[0].id)
  })
})

describe('squadStore', () => {
  it('저장하고 다시 불러온다', () => {
    const squad = createSquad('테스트', '4-3-3', [101000007], 1000)
    saveSquads([squad])
    expect(loadSquads()).toEqual([squad])
  })

  it('깨진 저장값은 무시하고 자리 수를 11개로 맞춘다', () => {
    localStorage.setItem(
      'fco.squads',
      JSON.stringify([{ id: 'a', name: 'x', formation: '4-4-2', slots: [1, 'bad', -3], updatedAt: 1 }, { nope: true }]),
    )
    const [squad, ...rest] = loadSquads()
    expect(rest).toHaveLength(0)
    expect(squad.slots).toEqual([1, ...Array(10).fill(null)])
    localStorage.setItem('fco.squads', '{not json')
    expect(loadSquads()).toEqual([])
  })

  it('두 자리를 맞바꾼다', () => {
    const slots = normalizeSlots([1, 2, 3])
    expect(swapSlots(slots, 0, 2).slice(0, 3)).toEqual([3, 2, 1])
  })

  it('같은 선수(pid)의 다른 카드를 넣으면 원래 자리는 비운다', () => {
    let slots = assignSlot(empty(), 3, 101000007)
    slots = assignSlot(slots, 5, 300000007)
    expect(slots[3]).toBeNull()
    expect(slots[5]).toBe(300000007)
    expect(assignSlot(slots, 5, null)[5]).toBeNull()
  })
})

describe('shareCode', () => {
  it('인코딩한 스쿼드를 그대로 되돌린다', () => {
    const slots = normalizeSlots([101000007, null, 300000009, 878231747])
    const code = encodeSquad('4-1-2-1-2', slots)
    expect(code).toMatch(/^[0-9a-z._-]+$/)
    expect(decodeSquad(code)).toEqual({ formation: '4-1-2-1-2', slots })
  })

  it('잘못된 코드는 null', () => {
    expect(decodeSquad('')).toBeNull()
    expect(decodeSquad('v2.4-4-2.' + '_'.repeat(10))).toBeNull()
    expect(decodeSquad('v1.9-9-9.' + '_'.repeat(10))).toBeNull()
    expect(decodeSquad('v1.4-4-2.abc')).toBeNull()
    expect(decodeSquad('v1.4-4-2.' + 'AB' + '_'.repeat(10))).toBeNull()
  })
})
