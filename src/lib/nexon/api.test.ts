import { afterEach, describe, expect, it, vi } from 'vitest'
import type { FetchLike } from './client.ts'
import {
  clearMatchDetailCache,
  getMatchDetail,
  getMatchDetails,
  getMatchIds,
  getOuid,
  splitMatchSides,
} from './fconline.ts'
import { playerImageUrls } from './images.ts'
import { classOfSpid, loadMeta, pidOfSpid, type MetaCache } from './meta.ts'
import { createRateLimiter } from './rateLimiter.ts'
import type { MatchDetail } from './types.ts'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status })
}

function memoryCache(initial: Record<string, unknown> = {}): MetaCache & { store: Map<string, unknown> } {
  const store = new Map<string, unknown>(Object.entries(initial))
  return {
    store,
    async get<T>(key: string) {
      return store.get(key) as { savedAt: number; data: T } | undefined
    },
    async set(key, value) {
      store.set(key, value)
    },
  }
}

afterEach(() => {
  clearMatchDetailCache()
})

describe('createRateLimiter', () => {
  it('창 안에서 한도를 넘으면 남은 시간만큼 기다린다', async () => {
    let clock = 0
    const sleeps: number[] = []
    const schedule = createRateLimiter({
      maxPerWindow: 2,
      windowMs: 1000,
      now: () => clock,
      sleep: async (ms) => {
        sleeps.push(ms)
        clock += ms
      },
    })
    const order: number[] = []
    await Promise.all([1, 2, 3].map((n) => schedule(async () => order.push(n))))
    expect(order).toEqual([1, 2, 3])
    expect(sleeps).toEqual([1000])
  })

  it('앞 작업이 실패해도 다음 작업은 실행된다', async () => {
    const schedule = createRateLimiter({ maxPerWindow: 5, windowMs: 1000 })
    await expect(schedule(async () => Promise.reject(new Error('x')))).rejects.toThrow('x')
    await expect(schedule(async () => 'ok')).resolves.toBe('ok')
  })
})

describe('fconline API', () => {
  it('닉네임 앞뒤 공백을 지우고 ouid를 조회한다', async () => {
    const fetchImpl = vi.fn<FetchLike>(async () => jsonResponse(200, { ouid: 'OUID1' }))
    await expect(getOuid({ apiKey: 'K', fetchImpl }, '  홍길동 ')).resolves.toBe('OUID1')
    expect(fetchImpl.mock.calls[0][0]).toContain('/fconline/v1/id?nickname=%ED%99%8D%EA%B8%B8%EB%8F%99')
  })

  it('매치 목록 limit은 1~100으로 제한한다', async () => {
    const fetchImpl = vi.fn<FetchLike>(async () => jsonResponse(200, ['m1']))
    await getMatchIds({ apiKey: 'K', fetchImpl }, 'OUID1', { matchtype: 50, limit: 500 })
    const url = new URL(fetchImpl.mock.calls[0][0])
    expect(url.pathname).toBe('/fconline/v1/user/match')
    expect(url.searchParams.get('limit')).toBe('100')
    expect(url.searchParams.get('matchtype')).toBe('50')
    expect(url.searchParams.get('offset')).toBe('0')
  })

  it('같은 매치 상세는 한 번만 호출한다', async () => {
    const detail = { matchId: 'm1', matchDate: '', matchType: 50, matchInfo: [] }
    const fetchImpl = vi.fn<FetchLike>(async () => jsonResponse(200, detail))
    const ctx = { apiKey: 'K', fetchImpl }
    await getMatchDetail(ctx, 'm1')
    await getMatchDetail(ctx, 'm1')
    expect(fetchImpl).toHaveBeenCalledOnce()
  })

  it('여러 매치 중 실패한 경기는 error로 돌려준다', async () => {
    const fetchImpl: FetchLike = async (url) =>
      url.includes('bad')
        ? jsonResponse(400, { error: { name: 'OPENAPI00003', message: 'x' } })
        : jsonResponse(200, { matchId: 'good', matchDate: '', matchType: 50, matchInfo: [] })
    const results = await getMatchDetails({ apiKey: 'K', fetchImpl }, ['good', 'bad'])
    expect(results[0].detail?.matchId).toBe('good')
    expect(results[1].error).toMatchObject({ kind: 'bad-request' })
  })

  it('매치 상세에서 내 기록과 상대 기록을 나눈다', () => {
    const detail = {
      matchInfo: [{ ouid: 'OPP' }, { ouid: 'ME' }],
    } as unknown as MatchDetail
    const { me, opponent } = splitMatchSides(detail, 'ME')
    expect(me?.ouid).toBe('ME')
    expect(opponent?.ouid).toBe('OPP')
  })
})

describe('loadMeta', () => {
  const positions = [{ spposition: 0, desc: 'GK' }]

  it('캐시가 없으면 받아서 저장한다', async () => {
    const cache = memoryCache()
    const fetchImpl = vi.fn<FetchLike>(async () => jsonResponse(200, positions))
    await expect(loadMeta('spposition', { fetchImpl, cache, now: () => 1000 })).resolves.toEqual(positions)
    expect(fetchImpl.mock.calls[0][0]).toBe('https://open.api.nexon.com/static/fconline/meta/spposition.json')
    expect(cache.store.get('fco.meta.spposition')).toEqual({ savedAt: 1000, data: positions })
  })

  it('유효 기간 안의 캐시는 네트워크를 쓰지 않는다', async () => {
    const cache = memoryCache({ 'fco.meta.spposition': { savedAt: 0, data: positions } })
    const fetchImpl = vi.fn<FetchLike>()
    await expect(loadMeta('spposition', { fetchImpl, cache, now: () => 1000 })).resolves.toEqual(positions)
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('만료된 캐시는 새로 받고, 실패하면 오래된 캐시를 쓴다', async () => {
    const old = [{ spposition: 0, desc: 'OLD' }]
    const cache = memoryCache({ 'fco.meta.spid': { savedAt: 0, data: old } })
    const twoDays = 2 * 24 * 60 * 60 * 1000
    const failing: FetchLike = async () => {
      throw new TypeError('offline')
    }
    await expect(loadMeta('spid', { fetchImpl: failing, cache, now: () => twoDays })).resolves.toEqual(old)
  })

  it('캐시도 없고 실패하면 오류를 던진다', async () => {
    const failing: FetchLike = async () => jsonResponse(500, {})
    await expect(loadMeta('class', { fetchImpl: failing, cache: memoryCache() })).rejects.toMatchObject({
      kind: 'server',
    })
  })

  it('동시에 요청하면 한 번만 받는다', async () => {
    const fetchImpl = vi.fn<FetchLike>(async () => jsonResponse(200, positions))
    const cache = memoryCache()
    await Promise.all([loadMeta('division', { fetchImpl, cache }), loadMeta('division', { fetchImpl, cache })])
    expect(fetchImpl).toHaveBeenCalledOnce()
  })
})

describe('spid 해석과 이미지', () => {
  it('spid를 클래스와 pid로 나눈다', () => {
    expect(classOfSpid(100000041)).toBe(100)
    expect(pidOfSpid(100000041)).toBe(41)
    expect(classOfSpid(830231747)).toBe(830)
    expect(pidOfSpid(830231747)).toBe(231747)
  })

  it('spid 이미지 다음에 pid 이미지를 후보로 준다', () => {
    expect(playerImageUrls(100000041)).toEqual([
      'https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/players/p100000041.png',
      'https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/players/p41.png',
    ])
  })
})
