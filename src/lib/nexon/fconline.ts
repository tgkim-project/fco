import { nexonGet, type FetchLike } from './client.ts'
import { createRateLimiter } from './rateLimiter.ts'
import type {
  MatchDetail,
  MaxDivision,
  OuidResponse,
  RankerStat,
  RankerStatQuery,
  TradeItem,
  TradeType,
  UserBasic,
} from './types.ts'

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

/** 내 이적시장 거래 기록 (API 키를 발급한 넥슨 계정 본인의 거래만 조회된다). 최근 거래부터 */
export function getTrades(
  ctx: FcOnlineContext,
  tradetype: TradeType,
  query: { offset?: number; limit?: number } = {},
): Promise<TradeItem[]> {
  const limit = Math.min(Math.max(query.limit ?? 20, 1), 100)
  return get<TradeItem[]>(ctx, '/fconline/v1/user/trade', { tradetype, offset: query.offset ?? 0, limit })
}

/** 한 번에 보낼 랭커 통계 조회 수 (명세: 많으면 413, 1회 50명 적합) */
export const RANKER_BATCH_SIZE = 50

/**
 * TOP 10,000 랭커가 사용한 선수(카드+포지션)의 20경기 평균 스탯.
 * 50개씩 나눠 요청하고 결과를 합친다. 랭커가 쓰지 않은 조합은 결과에 없을 수 있다.
 */
export async function getRankerStats(
  ctx: FcOnlineContext,
  matchtype: number,
  players: RankerStatQuery[],
): Promise<RankerStat[]> {
  const results: RankerStat[] = []
  for (let i = 0; i < players.length; i += RANKER_BATCH_SIZE) {
    const batch = players.slice(i, i + RANKER_BATCH_SIZE)
    // URLSearchParams가 JSON 문자열을 URL 인코딩한다
    const page = await get<RankerStat[]>(ctx, '/fconline/v1/ranker-stats', {
      matchtype,
      players: JSON.stringify(batch),
    })
    results.push(...page)
  }
  return results
}

/** 테스트용: 메모리 캐시 비우기 */
export function clearMatchDetailCache() {
  matchDetailCache.clear()
}

/** 매치 상세에서 내 기록과 상대 기록을 나눈다 */
export function splitMatchSides(detail: MatchDetail, ouid: string) {
  // 비정상 응답(matchInfo 없음)에도 화면이 깨지지 않도록
  const infos = Array.isArray(detail.matchInfo) ? detail.matchInfo : []
  const me = infos.find((info) => info.ouid === ouid)
  const opponent = infos.find((info) => info.ouid !== ouid)
  return { me, opponent }
}
