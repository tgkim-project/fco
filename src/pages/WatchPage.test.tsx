import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App.tsx'
import { setApiKey } from '../lib/apiKeyStore.ts'
import { getWatchlist } from '../lib/watchlist.ts'

const KEY = 'test_0123456789abcdef0123456789abcdef'
let matches: Record<number, string[]>

beforeEach(() => {
  setApiKey(KEY)
  matches = { 50: ['m1'], 52: [] }
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string) => {
      const url = new URL(input)
      const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
      switch (url.pathname) {
        case '/fconline/v1/id':
          return url.searchParams.get('nickname') === '친구'
            ? json({ ouid: 'OUID-F' })
            : json({ error: { name: 'OPENAPI00004', message: 'x' } }, 400)
        case '/fconline/v1/user/basic':
          return json({ ouid: 'OUID-F', nickname: '친구', level: 50 })
        case '/fconline/v1/user/maxdivision':
          return json([])
        case '/fconline/v1/user/match':
          return json(matches[Number(url.searchParams.get('matchtype'))] ?? [])
        default:
          return json([], 200)
      }
    }),
  )
})

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('관심 유저 화면', () => {
  it('닉네임을 등록하고, 새 경기가 생기면 표시하고, 전적을 보면 사라진다', async () => {
    const user = userEvent.setup()
    renderAt('/watch')

    await user.type(screen.getByRole('textbox', { name: '등록할 닉네임' }), '친구')
    await user.click(screen.getByRole('button', { name: '등록' }))
    const list = await screen.findByRole('list', { name: '관심 유저 목록' })
    expect(within(list).getByText('친구')).toBeInTheDocument()
    expect(within(list).getByText('새 경기 없음')).toBeInTheDocument()

    matches[50] = ['m3', 'm2', 'm1']
    await user.click(screen.getByRole('button', { name: '지금 확인' }))
    expect(await within(list).findByText('새 경기 2', {}, { timeout: 4000 })).toBeInTheDocument()
    expect(list).toHaveTextContent('공식경기 2 · 감독모드 0')

    await user.click(within(list).getByRole('link', { name: '전적 보기' }))
    expect(screen.getByRole('heading', { name: '전적 검색' })).toBeInTheDocument()
    expect(getWatchlist()[0].types[50].lastSeen).toBe('m3')
  }, 15000)

  it('즉시 갱신되지 않는다는 안내를 보여준다', () => {
    renderAt('/watch')
    const note = screen.getByRole('note', { name: '갱신 안내' })
    expect(note).toHaveTextContent('경기 결과는 바로 갱신되지 않습니다')
    expect(note).toHaveTextContent('2~3시간 뒤')
  })

  it('없는 닉네임은 안내한다', async () => {
    const user = userEvent.setup()
    renderAt('/watch')
    await user.type(screen.getByRole('textbox', { name: '등록할 닉네임' }), '없는유저')
    await user.click(screen.getByRole('button', { name: '등록' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('해당 닉네임의 유저를 찾을 수 없습니다')
  })

  it('전적 화면에서 관심 유저로 등록·해제할 수 있다', async () => {
    const user = userEvent.setup()
    renderAt('/match?nickname=친구')
    const button = await screen.findByRole('button', { name: '☆ 관심 유저 등록' }, { timeout: 4000 })
    await user.click(button)
    expect(await screen.findByRole('button', { name: '★ 관심 유저' }, { timeout: 4000 })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(getWatchlist().map((u) => u.nickname)).toEqual(['친구'])

    await user.click(screen.getByRole('button', { name: '★ 관심 유저' }))
    expect(getWatchlist()).toEqual([])
  }, 15000)

  it('키가 없으면 등록을 안내한다', () => {
    localStorage.clear()
    renderAt('/watch')
    expect(screen.getByText('API 키가 필요합니다')).toBeInTheDocument()
  })
})
