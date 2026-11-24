import { describe, expect, it, vi } from 'vitest'
import type { FetchLike } from './nexon/client.ts'
import {
  addWatchedUser,
  checkWatchedUser,
  getWatchlist,
  markWatchedSeen,
  newMatchCount,
  removeWatchedUser,
  totalNewMatches,
  WATCH_LIMIT,
  WatchlistFullError,
} from './watchlist.ts'

/** 닉네임 → ouid, 매치 종류별 경기 목록을 바꿔 가며 흉내 내는 가짜 API */
function fakeApi(matches: Record<number, string[]>) {
  const fetchImpl = vi.fn<FetchLike>(async (input) => {
    const url = new URL(input)
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
    switch (url.pathname) {
      case '/fconline/v1/id': {
        const nick = url.searchParams.get('nickname') ?? ''
        return nick.startsWith('없는')
          ? json({ error: { name: 'OPENAPI00004', message: 'x' } }, 400)
          : json({ ouid: `ouid-${nick}` })
      }
      case '/fconline/v1/user/basic':
        return json({ ouid: url.searchParams.get('ouid'), nickname: url.searchParams.get('ouid')?.slice(5), level: 1 })
      case '/fconline/v1/user/match':
        return json(matches[Number(url.searchParams.get('matchtype'))] ?? [])
      default:
        return json({}, 404)
    }
  })
  return { ctx: { apiKey: 'K', fetchImpl }, fetchImpl, matches }
}

describe('newMatchCount', () => {
  it('마지막으로 본 경기 앞에 쌓인 경기 수를 센다', () => {
    expect(newMatchCount({ lastSeen: 'm1', latest: ['m3', 'm2', 'm1'] })).toBe(2)
    expect(newMatchCount({ lastSeen: 'm1', latest: ['m1'] })).toBe(0)
    // 본 경기가 목록에서 밀려나면 목록 전체가 새 경기
    expect(newMatchCount({ lastSeen: 'old', latest: ['a', 'b'] })).toBe(2)
    // 등록 당시 경기가 없었으면 지금 있는 경기가 모두 새 경기
    expect(newMatchCount({ lastSeen: null, latest: ['a'] })).toBe(1)
    expect(newMatchCount(undefined)).toBe(0)
  })
})

describe('관심 유저 저장·확인', () => {
  it('등록할 때 지금까지 경기는 본 것으로 두고, 확인하면 새 경기가 늘고, 보면 0이 된다', async () => {
    const api = fakeApi({ 50: ['m1'], 52: [] })
    const user = await addWatchedUser(api.ctx, '친구', 1000)
    expect(user).toMatchObject({ ouid: 'ouid-친구', nickname: '친구', addedAt: 1000 })
    expect(totalNewMatches(user)).toBe(0)

    api.matches[50] = ['m3', 'm2', 'm1']
    api.matches[52] = ['d1']
    const checked = await checkWatchedUser(api.ctx, 'ouid-친구', 2000)
    expect(checked?.lastCheckedAt).toBe(2000)
    expect(newMatchCount(checked?.types[50])).toBe(2)
    expect(newMatchCount(checked?.types[52])).toBe(1)
    expect(totalNewMatches(getWatchlist()[0])).toBe(3)

    markWatchedSeen('ouid-친구')
    expect(totalNewMatches(getWatchlist()[0])).toBe(0)
  })

  it('같은 유저는 한 번만 등록되고, 최대 인원을 넘으면 거절한다', async () => {
    const api = fakeApi({})
    await addWatchedUser(api.ctx, '친구')
    await addWatchedUser(api.ctx, '친구')
    expect(getWatchlist()).toHaveLength(1)

    for (let i = 1; i < WATCH_LIMIT; i++) await addWatchedUser(api.ctx, `유저${i}`)
    expect(getWatchlist()).toHaveLength(WATCH_LIMIT)
    await expect(addWatchedUser(api.ctx, '한명더')).rejects.toBeInstanceOf(WatchlistFullError)
  }, 15000)

  it('없는 닉네임은 오류, 삭제하면 목록에서 빠진다', async () => {
    const api = fakeApi({})
    await expect(addWatchedUser(api.ctx, '없는유저')).rejects.toMatchObject({ kind: 'bad-request' })
    await addWatchedUser(api.ctx, '친구')
    removeWatchedUser('ouid-친구')
    expect(getWatchlist()).toEqual([])
  })
})
