import { DEFAULT_FORMATION_ID } from './formations.ts'

// 스쿼드는 기기에만 저장한다 (localStorage: fco.squads)

export const SLOT_COUNT = 11

export interface Squad {
  id: string
  name: string
  formation: string
  /** 자리별 선수 카드 spid (빈 자리는 null), 길이 11 */
  slots: Array<number | null>
  updatedAt: number
}

const STORAGE_KEY = 'fco.squads'

function isSquad(value: unknown): value is Squad {
  if (!value || typeof value !== 'object') return false
  const s = value as Squad
  return (
    typeof s.id === 'string' &&
    typeof s.name === 'string' &&
    typeof s.formation === 'string' &&
    Array.isArray(s.slots) &&
    typeof s.updatedAt === 'number'
  )
}

export function normalizeSlots(slots: Array<number | null | undefined>): Array<number | null> {
  return Array.from({ length: SLOT_COUNT }, (_, i) => {
    const v = slots[i]
    return typeof v === 'number' && Number.isInteger(v) && v > 0 ? v : null
  })
}

export function loadSquads(): Squad[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isSquad).map((s) => ({ ...s, slots: normalizeSlots(s.slots) }))
  } catch {
    return []
  }
}

export function saveSquads(squads: Squad[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(squads))
  } catch {
    // 저장 공간 부족 등은 무시 (화면 상태는 유지)
  }
}

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

export function createSquad(
  name: string,
  formation = DEFAULT_FORMATION_ID,
  slots: Array<number | null> = [],
  now = Date.now(),
): Squad {
  return { id: newId(), name, formation, slots: normalizeSlots(slots), updatedAt: now }
}

/** 두 자리의 선수를 맞바꾼다 */
export function swapSlots(slots: Array<number | null>, a: number, b: number): Array<number | null> {
  const next = [...slots]
  ;[next[a], next[b]] = [next[b], next[a]]
  return next
}

/** 자리에 선수를 넣는다. 같은 선수(pid)가 다른 자리에 있으면 그 자리는 비운다 */
export function assignSlot(slots: Array<number | null>, index: number, spid: number | null): Array<number | null> {
  const pid = spid == null ? null : spid % 1_000_000
  return slots.map((s, i) => {
    if (i === index) return spid
    if (pid != null && s != null && s % 1_000_000 === pid) return null
    return s
  })
}
