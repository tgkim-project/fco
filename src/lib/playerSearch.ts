import { classOfSpid, pidOfSpid } from './nexon/meta.ts'
import type { SpidMeta } from './nexon/types.ts'

// 한글 음절의 초성 (가 = U+AC00, 초성 19개 × 중성 21 × 종성 28)
const CHOSUNG = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']
const HANGUL_START = 0xac00
const HANGUL_END = 0xd7a3
const JAMO_ONLY = /^[ㄱ-ㅎ]+$/

/** 문자열의 한글은 초성으로, 나머지 글자는 그대로 둔다 */
export function toChosung(text: string): string {
  let out = ''
  for (const ch of text) {
    const code = ch.charCodeAt(0)
    out += code >= HANGUL_START && code <= HANGUL_END ? CHOSUNG[Math.floor((code - HANGUL_START) / 588)] : ch
  }
  return out
}

/** 비교용: 소문자, 공백·점·하이픈 제거 */
export function normalizeName(text: string): string {
  return text.toLowerCase().replace(/[\s.\-·']/g, '')
}

/** 같은 선수(pid)의 여러 카드(spid)를 묶은 것 */
export interface PlayerGroup {
  pid: number
  name: string
  /** 클래스 번호 내림차순 (번호 순서가 출시 순서와 같다는 보장은 없음) */
  spids: number[]
  key: string
  chosung: string
}

export function buildPlayerIndex(spids: SpidMeta[]): PlayerGroup[] {
  const byPid = new Map<number, PlayerGroup>()
  for (const { id, name } of spids) {
    const pid = pidOfSpid(id)
    let group = byPid.get(pid)
    if (!group) {
      const key = normalizeName(name)
      group = { pid, name, spids: [], key, chosung: toChosung(key) }
      byPid.set(pid, group)
    }
    group.spids.push(id)
  }
  const groups = [...byPid.values()]
  for (const g of groups) g.spids.sort((a, b) => classOfSpid(b) - classOfSpid(a))
  return groups
}

export interface SearchOptions {
  /** 이 클래스 카드가 있는 선수만 */
  classId?: number | null
  limit?: number
}

/**
 * 이름 검색. 자음만 입력하면 초성 검색(예: "ㅅㅎㅁ" → 손흥민).
 * 정확히 일치 → 앞부분 일치 → 포함 순으로 정렬한다.
 */
export function searchPlayers(index: PlayerGroup[], query: string, options: SearchOptions = {}): PlayerGroup[] {
  const { classId = null, limit = 50 } = options
  const q = normalizeName(query)
  const inClass = (g: PlayerGroup) => classId == null || g.spids.some((s) => classOfSpid(s) === classId)

  if (!q) {
    // 검색어 없이 클래스만 고르면 그 클래스 선수 전체(이름순)
    if (classId == null) return []
    return index
      .filter(inClass)
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
      .slice(0, limit)
  }

  const field = JAMO_ONLY.test(q) ? 'chosung' : 'key'
  const scored: Array<{ g: PlayerGroup; score: number }> = []
  for (const g of index) {
    const target = g[field]
    const pos = target.indexOf(q)
    if (pos < 0 || !inClass(g)) continue
    const score = target === q ? 0 : pos === 0 ? 1 : 2
    scored.push({ g, score })
  }
  // 같은 일치 수준이면 짧은 이름 → 카드가 많은 선수(대체로 유명 선수) → 이름순
  scored.sort(
    (a, b) =>
      a.score - b.score ||
      a.g.name.length - b.g.name.length ||
      b.g.spids.length - a.g.spids.length ||
      a.g.name.localeCompare(b.g.name, 'ko'),
  )
  return scored.slice(0, limit).map((s) => s.g)
}
