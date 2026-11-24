import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App.tsx'
import { setApiKey } from '../lib/apiKeyStore.ts'
import { getRecentNicknames } from '../lib/recentSearches.ts'

const KEY = 'test_0123456789abcdef0123456789abcdef'

function side(ouid: string, nickname: string, result: '승' | '패', goals: number, spId: number) {
  return {
    ouid,
    nickname,
    matchDetail: { matchResult: result, possession: 55, cornerKick: 3, foul: 1, averageRating: 7.4 },
    shoot: { shootTotal: 10, effectiveShootTotal: 6, goalTotalDisplay: goals },
    shootDetail: goals ? [{ goalTime: 600, result: 3, spId, assist: false, assistSpId: 0 }] : [],
    pass: { passTry: 100, passSuccess: 85 },
    defence: { tackleTry: 10, tackleSuccess: 4 },
    player: [{ spId, spPosition: 25, spGrade: 5, status: { spRating: 8.1, goal: goals, assist: 0 } }],
  }
}

const DETAIL = {
  matchId: 'm1',
  matchDate: '2026-11-20T12:00:00',
  matchType: 50,
  matchInfo: [side('OPP', '상대유저', '패', 1, 300000002), side('OUID1', '테스트유저', '승', 2, 101000001)],
}

const ROUTES: Record<string, (url: URL) => [number, unknown]> = {
  '/fconline/v1/id': (url) =>
    url.searchParams.get('nickname') === '테스트유저'
      ? [200, { ouid: 'OUID1' }]
      : [400, { error: { name: 'OPENAPI00004', message: 'x' } }],
  '/fconline/v1/user/basic': () => [200, { ouid: 'OUID1', nickname: '테스트유저', level: 77 }],
  '/fconline/v1/user/maxdivision': () => [200, [{ matchType: 50, division: 800, achievementDate: '2026-11-01T10:00:00' }]],
  '/fconline/v1/user/match': () => [200, ['m1']],
  '/fconline/v1/match-detail': () => [200, DETAIL],
  '/fconline/v1/ranker-stats': () => [
    200,
    [
      {
        spId: 101000001,
        spPosition: 25,
        status: { goal: 0.85, assist: 0.2, passTry: 20, passSuccess: 15, matchCount: 900 },
        createDate: '2026-11-23T00:00:00',
      },
    ],
  ],
  '/static/fconline/meta/matchtype.json': () => [200, [{ matchtype: 50, desc: '공식경기' }, { matchtype: 52, desc: '감독모드' }]],
  '/static/fconline/meta/division.json': () => [200, [{ divisionId: 800, divisionName: '슈퍼 챔피언스' }]],
  '/static/fconline/meta/division-volta.json': () => [200, []],
  '/static/fconline/meta/spid.json': () => [200, [{ id: 101000001, name: '테스트공격수' }, { id: 300000002, name: '상대선수' }]],
  '/static/fconline/meta/spposition.json': () => [200, [{ spposition: 25, desc: 'ST' }]],
  '/static/fconline/meta/class.json': () => [200, [{ class: 101, className: 'ICON (ICON)', classImg: '' }]],
}

function stubApi() {
  const fetchMock = vi.fn(async (input: string) => {
    const url = new URL(input)
    const route = ROUTES[url.pathname]
    if (!route) return new Response('{}', { status: 404 })
    const [status, body] = route(url)
    return new Response(JSON.stringify(body), { status })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  setApiKey(KEY)
  stubApi()
})

describe('전적 검색', () => {
  it('닉네임으로 유저 정보와 경기 목록을 보여주고 상세를 펼친다', async () => {
    const user = userEvent.setup()
    renderAt('/match')

    await user.type(screen.getByRole('textbox', { name: '닉네임' }), '테스트유저')
    await user.click(screen.getByRole('button', { name: '검색' }))

    const summary = await screen.findByLabelText('유저 정보')
    expect(summary).toHaveTextContent('테스트유저')
    expect(summary).toHaveTextContent('Lv.77')
    expect(await within(summary).findByText('슈퍼 챔피언스')).toBeInTheDocument()

    const row = await screen.findByRole('button', { name: /승\s*2 : 1\s*vs 상대유저/ }, { timeout: 4000 })
    await user.click(row)
    expect(row).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('rowheader', { name: '패스 성공률' }).parentElement).toHaveTextContent('85%패스 성공률85%')
    expect(await screen.findAllByText(/테스트공격수/)).not.toHaveLength(0)
    expect(screen.getByText("11' 테스트공격수", { exact: false })).toBeInTheDocument()

    expect(getRecentNicknames()).toEqual(['테스트유저'])
  }, 10000)

  it('불러온 경기로 요약 통계를 보여주고 랭커 평균과 비교한다', async () => {
    const user = userEvent.setup()
    renderAt('/match?nickname=테스트유저')

    const summary = await screen.findByLabelText('전적 요약', {}, { timeout: 4000 })
    expect(summary).toHaveTextContent('최근 1경기 · 1승 0무 0패 (승률 100%)')
    expect(summary).toHaveTextContent('평균 득점2.0')
    expect(summary).toHaveTextContent('패스 성공률85%')
    expect(await within(summary).findByText('테스트공격수')).toBeInTheDocument()

    await user.click(within(summary).getByRole('button', { name: '랭커 평균과 비교' }))
    expect(await within(summary).findByText('0.85 / 0.20 / 75%')).toBeInTheDocument()
  }, 10000)

  it('없는 닉네임이면 안내한다', async () => {
    renderAt('/match?nickname=없는유저')
    expect(await screen.findByRole('alert')).toHaveTextContent('해당 닉네임의 유저를 찾을 수 없습니다')
  })

  it('최근 검색을 눌러 다시 검색하고 삭제할 수 있다', async () => {
    localStorage.setItem('fco.recentNicknames', JSON.stringify(['테스트유저', '다른유저']))
    const user = userEvent.setup()
    renderAt('/match')

    await user.click(screen.getByRole('button', { name: '다른유저 최근 검색에서 삭제' }))
    expect(screen.queryByRole('button', { name: '다른유저' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '테스트유저' }))
    expect(await screen.findByLabelText('유저 정보')).toHaveTextContent('테스트유저')
  })
})
