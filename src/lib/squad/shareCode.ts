import { FORMATIONS } from './formations.ts'
import { normalizeSlots, SLOT_COUNT } from './squadStore.ts'

// 공유 코드: "v1.<포메이션>.<spid 11개를 36진수로 _ 로 연결, 빈 자리는 빈 칸>"
// URL에 그대로 넣을 수 있는 문자만 쓴다. 예: v1.4-2-3-1.1nchs0__1nchs1_...

const VERSION = 'v1'

export interface SharedSquad {
  formation: string
  slots: Array<number | null>
}

export function encodeSquad(formation: string, slots: Array<number | null>): string {
  const body = normalizeSlots(slots)
    .map((s) => (s == null ? '' : s.toString(36)))
    .join('_')
  return `${VERSION}.${formation}.${body}`
}

export function decodeSquad(code: string): SharedSquad | null {
  const [version, formation, body] = code.split('.')
  if (version !== VERSION || body === undefined) return null
  if (!FORMATIONS.some((f) => f.id === formation)) return null
  const parts = body.split('_')
  if (parts.length !== SLOT_COUNT) return null
  const slots: Array<number | null> = []
  for (const part of parts) {
    if (part === '') {
      slots.push(null)
      continue
    }
    if (!/^[0-9a-z]+$/.test(part)) return null
    const n = parseInt(part, 36)
    if (!Number.isSafeInteger(n) || n <= 0) return null
    slots.push(n)
  }
  return { formation, slots }
}
