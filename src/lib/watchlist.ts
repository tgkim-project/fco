import { getMatchIds, getOuid, getUserBasic, type FcOnlineContext } from './nexon/fconline.ts'

// 관심 유저: 닉네임을 등록해 두고, 확인할 때마다 새 경기가 몇 개 생겼는지 보여준다.
// 기기에만 저장 (localStorage: fco.watchlist). 앱 단계에서 백그라운드 확인·알림에 같은 로직을 쓴다.

/** 새 경기를 확인하는 매치 종류: 공식경기, 감독모드 */
export const WATCH_MATCH_TYPES = [50, 52] as const
/** 매치 종류별로 기억하는 최근 경기 수 (이보다 많이 쌓이면 "20+"로 표시) */
export const WATCH_DEPTH = 20
export const WATCH_LIMIT = 10

export interface WatchTypeState {
  /** 마지막으로 "봤다"고 표시한 시점의 가장 최근 경기 ID. null = 등록 당시 경기가 없었음 */
  lastSeen: string | null
  /** 마지막 확인 때 받은 최근 경기 ID (최신순) */
  latest: string[]
}

export interface WatchedUser {
  ouid: string
  nickname: string
  addedAt: number
  lastCheckedAt: number
  types: Record<number, WatchTypeState>
}

const STORAGE_KEY = 'fco.watchlist'
type Listener = () => void
const listeners = new Set<Listener>()

// useSyncExternalStore가 같은 값을 받도록 읽은 결과를 캐시한다
let cacheRaw: string | null | undefined
let cacheValue: WatchedUser[] = []

export function getWatchlist(): WatchedUser[] {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(STORAGE_KEY)
  } catch {
    raw = null
  }
  if (raw === cacheRaw) return cacheValue
  cacheRaw = raw
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : []
    cacheValue = Array.isArray(parsed)
      ? parsed.filter(
          (u): u is WatchedUser =>
            !!u && typeof u.ouid === 'string' && typeof u.nickname === 'string' && typeof u.types === 'object',
        )
      : []
  } catch {
    cacheValue = []
  }
  return cacheValue
}

function save(list: WatchedUser[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    // 저장 실패는 무시
  }
  for (const l of listeners) l()
}

export function subscribeWatchlist(listener: Listener): () => void {
  listeners.add(listener)
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) listener()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

export function isWatched(ouid: string): boolean {
  return getWatchlist().some((u) => u.ouid === ouid)
}

/** 마지막으로 본 뒤 새로 생긴 경기 수 (WATCH_DEPTH 이상이면 WATCH_DEPTH) */
export function newMatchCount(state: WatchTypeState | undefined): number {
  if (!state) return 0
  if (state.lastSeen === null) return state.latest.length
  const i = state.latest.indexOf(state.lastSeen)
  return i === -1 ? state.latest.length : i
}

export function totalNewMatches(user: WatchedUser): number {
  return WATCH_MATCH_TYPES.reduce((sum, t) => sum + newMatchCount(user.types[t]), 0)
}

async function fetchLatest(ctx: FcOnlineContext, ouid: string): Promise<Record<number, string[]>> {
  const result: Record<number, string[]> = {}
  for (const t of WATCH_MATCH_TYPES) {
    result[t] = await getMatchIds(ctx, ouid, { matchtype: t, limit: WATCH_DEPTH })
  }
  return result
}

export class WatchlistFullError extends Error {
  constructor() {
    super(`관심 유저는 최대 ${WATCH_LIMIT}명까지 등록할 수 있습니다.`)
    this.name = 'WatchlistFullError'
  }
}

/** 닉네임으로 관심 유저를 등록한다. 지금까지의 경기는 "본 것"으로 두고 이후 새 경기만 센다 */
export async function addWatchedUser(ctx: FcOnlineContext, nickname: string, now = Date.now()): Promise<WatchedUser> {
  const ouid = await getOuid(ctx, nickname)
  const existing = getWatchlist().find((u) => u.ouid === ouid)
  if (existing) return existing
  if (getWatchlist().length >= WATCH_LIMIT) throw new WatchlistFullError()
  const basic = await getUserBasic(ctx, ouid)
  const latest = await fetchLatest(ctx, ouid)
  const types: Record<number, WatchTypeState> = {}
  for (const t of WATCH_MATCH_TYPES) types[t] = { lastSeen: latest[t][0] ?? null, latest: latest[t] }
  const user: WatchedUser = { ouid, nickname: basic.nickname, addedAt: now, lastCheckedAt: now, types }
  save([...getWatchlist(), user])
  return user
}

export function removeWatchedUser(ouid: string): void {
  save(getWatchlist().filter((u) => u.ouid !== ouid))
}

/** 새 경기를 확인해 latest만 갱신한다 (lastSeen은 그대로 → 새 경기 수가 늘어남) */
export async function checkWatchedUser(ctx: FcOnlineContext, ouid: string, now = Date.now()): Promise<WatchedUser | null> {
  const latest = await fetchLatest(ctx, ouid)
  let updated: WatchedUser | null = null
  save(
    getWatchlist().map((u) => {
      if (u.ouid !== ouid) return u
      const types: Record<number, WatchTypeState> = {}
      for (const t of WATCH_MATCH_TYPES) {
        const prev = u.types[t] ?? { lastSeen: latest[t][0] ?? null, latest: [] }
        types[t] = { lastSeen: prev.lastSeen, latest: latest[t] }
      }
      updated = { ...u, types, lastCheckedAt: now }
      return updated
    }),
  )
  return updated
}

/** 새 경기를 "봤다"고 표시: lastSeen을 최신 경기로 */
export function markWatchedSeen(ouid: string): void {
  save(
    getWatchlist().map((u) => {
      if (u.ouid !== ouid) return u
      const types: Record<number, WatchTypeState> = {}
      for (const t of WATCH_MATCH_TYPES) {
        const s = u.types[t] ?? { lastSeen: null, latest: [] }
        types[t] = { lastSeen: s.latest[0] ?? s.lastSeen, latest: s.latest }
      }
      return { ...u, types }
    }),
  )
}
