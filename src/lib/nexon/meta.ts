import { get as idbGet, set as idbSet } from 'idb-keyval'
import { NEXON_API_BASE, type FetchLike } from './client.ts'
import { NexonApiError } from './errors.ts'
import type { ClassMeta, DivisionMeta, MatchTypeMeta, SeasonMeta, SpidMeta, SpPositionMeta } from './types.ts'

// 메타데이터는 키 없이 받을 수 있다: https://open.api.nexon.com/static/fconline/meta/{name}.json
// seasonid.json은 2026-11-19 이후 종료 예정 → class.json 사용.
// 약관 고지: API로 받아 저장한 데이터는 30일 이내 갱신해야 하므로 TTL은 그보다 짧게 둔다.

export interface MetaTypes {
  matchtype: MatchTypeMeta[]
  division: DivisionMeta[]
  'division-volta': DivisionMeta[]
  season: SeasonMeta[]
  class: ClassMeta[]
  spposition: SpPositionMeta[]
  spid: SpidMeta[]
}

export type MetaName = keyof MetaTypes

const DAY = 24 * 60 * 60 * 1000
/** spid는 새 카드가 자주 추가되므로 하루, 나머지는 일주일 */
const TTL: Record<MetaName, number> = {
  matchtype: 7 * DAY,
  division: 7 * DAY,
  'division-volta': 7 * DAY,
  season: DAY,
  class: DAY,
  spposition: 7 * DAY,
  spid: DAY,
}

interface CacheEntry<T> {
  savedAt: number
  data: T
}

export interface MetaCache {
  get<T>(key: string): Promise<CacheEntry<T> | undefined>
  set<T>(key: string, value: CacheEntry<T>): Promise<void>
}

/** IndexedDB 캐시. 사용할 수 없는 환경(사파리 사생활 보호 모드 등)에서는 조용히 건너뛴다 */
export const indexedDbCache: MetaCache = {
  async get<T>(key: string) {
    try {
      return await idbGet<CacheEntry<T>>(key)
    } catch {
      return undefined
    }
  },
  async set<T>(key: string, value: CacheEntry<T>) {
    try {
      await idbSet(key, value)
    } catch {
      // 캐시 실패는 무시 (다음에 다시 받음)
    }
  },
}

export interface LoadMetaOptions {
  fetchImpl?: FetchLike
  cache?: MetaCache
  now?: () => number
  /** true면 캐시를 무시하고 새로 받는다 */
  force?: boolean
}

const inflight = new Map<string, Promise<unknown>>()

export function metaUrl(name: MetaName): string {
  return `${NEXON_API_BASE}/static/fconline/meta/${name}.json`
}

/**
 * 메타데이터를 캐시 우선으로 불러온다.
 * - 캐시가 TTL 안이면 캐시 사용
 * - 만료됐으면 새로 받되, 실패하면 오래된 캐시라도 돌려준다
 */
export async function loadMeta<N extends MetaName>(name: N, options: LoadMetaOptions = {}): Promise<MetaTypes[N]> {
  const { fetchImpl = fetch, cache = indexedDbCache, now = Date.now, force = false } = options
  const key = `fco.meta.${name}`

  const cached = await cache.get<MetaTypes[N]>(key)
  if (!force && cached && now() - cached.savedAt < TTL[name]) return cached.data

  const existing = inflight.get(key) as Promise<MetaTypes[N]> | undefined
  if (existing) return existing

  const request = (async () => {
    try {
      let response: Response
      try {
        response = await fetchImpl(metaUrl(name))
      } catch {
        throw new NexonApiError('network', null, null)
      }
      if (!response.ok) throw new NexonApiError(response.status >= 500 ? 'server' : 'bad-request', response.status, null)
      const data = (await response.json()) as MetaTypes[N]
      await cache.set(key, { savedAt: now(), data })
      return data
    } catch (error) {
      if (cached) return cached.data
      throw error
    } finally {
      inflight.delete(key)
    }
  })()
  inflight.set(key, request)
  return request
}

// ---- spid 해석 ----

/** spid = 클래스(앞 3자리) × 1,000,000 + 선수 식별자 pid(뒤 6자리) */
export function classOfSpid(spid: number): number {
  return Math.floor(spid / 1_000_000)
}

export function pidOfSpid(spid: number): number {
  return spid % 1_000_000
}

export function toLookup<T, K extends PropertyKey, V>(items: T[], key: (item: T) => K, value: (item: T) => V) {
  const map = new Map<K, V>()
  for (const item of items) map.set(key(item), value(item))
  return map
}
