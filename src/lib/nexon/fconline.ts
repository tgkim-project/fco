import { nexonGet, type FetchLike } from './client.ts'
import { createRateLimiter } from './rateLimiter.ts'
import type { MatchDetail, MaxDivision, OuidResponse, UserBasic } from './types.ts'

// 개발 단계 키: 초당 5건 (openapi.nexon.com/ko/guide/prepare-in-advance/)
const schedule = createRateLimiter({ maxPerWindow: 5, windowMs: 1000 })

/** 매치 상세는 바뀌지 않으므로 메모리에 보관해 같은 경기를 다시 부르지 않는다 */
const matchDetailCache = new Map<string, MatchDetail>()
const MATCH_CACHE_LIMIT = 500

export interface FcOnlineContext {
  apiKey: string
  fetchImpl?: FetchLike
  signal?: AbortSignal
}

function get<T>(ctx: FcOnlineContext, path: string, params: Record<string, string | number | undefined>) {
  return schedule(() => nexonGet<T>(path, { apiKey: ctx.apiKey, params, fetchImpl: ctx.fetchImpl, signal: ctx.signal }))
}

/** 닉네임 → 계정 식별자(ouid). 없는 닉네임이면 NexonApiError(bad-request) */
export async function getOuid(ctx: FcOnlineContext, nickname: string): Promise<string> {
  const res = await get<OuidResponse>(ctx, '/fconline/v1/id', { nickname: nickname.trim() })
  return res.ouid
}

export function getUserBasic(ctx: FcOnlineContext, ouid: string): Promise<UserBasic> {
  return get<UserBasic>(ctx, '/fconline/v1/user/basic', { ouid })
}

export function getMaxDivision(ctx: FcOnlineContext, ouid: string): Promise<MaxDivision[]> {
  return get<MaxDivision[]>(ctx, '/fconline/v1/user/maxdivision', { ouid })
}

export interface MatchListQuery {
  matchtype: number
  offset?: number
  /** 최대 100 */
  limit?: number
}

/** 최근 경기부터 매치 ID 목록 */
export function getMatchIds(ctx: FcOnlineContext, ouid: string, query: MatchListQuery): Promise<string[]> {
  const limit = Math.min(Math.max(query.limit ?? 20, 1), 100)
  return get<string[]>(ctx, '/fconline/v1/user/match', {
    ouid,
    matchtype: query.matchtype,
    offset: query.offset ?? 0,
    limit,
  })
}

export async function getMatchDetail(ctx: FcOnlineContext, matchId: string): Promise<MatchDetail> {
  const cached = matchDetailCache.get(matchId)
  if (cached) return cached
  const detail = await get<MatchDetail>(ctx, '/fconline/v1/match-detail', { matchid: matchId })
  matchDetailCache.set(matchId, detail)
  if (matchDetailCache.size > MATCH_CACHE_LIMIT) {
    const oldest = matchDetailCache.keys().next().value
    if (oldest !== undefined) matchDetailCache.delete(oldest)
  }
  return detail
}

/** 여러 경기 상세를 순서대로 가져온다(호출 한도는 rate limiter가 지킴). 실패한 경기는 error로 돌려준다 */
export async function getMatchDetails(
  ctx: FcOnlineContext,
  matchIds: string[],
): Promise<Array<{ matchId: string; detail?: MatchDetail; error?: unknown }>> {
  return Promise.all(
    matchIds.map((matchId) =>
      getMatchDetail(ctx, matchId).then(
        (detail) => ({ matchId, detail }),
        (error: unknown) => ({ matchId, error }),
      ),
    ),
  )
}

/** 테스트용: 메모리 캐시 비우기 */
export function clearMatchDetailCache() {
  matchDetailCache.clear()
}

/** 매치 상세에서 내 기록과 상대 기록을 나눈다 */
export function splitMatchSides(detail: MatchDetail, ouid: string) {
  const me = detail.matchInfo.find((info) => info.ouid === ouid)
  const opponent = detail.matchInfo.find((info) => info.ouid !== ouid)
  return { me, opponent }
}
