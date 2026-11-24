import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import App from '../App.tsx'
import { setApiKey } from '../lib/apiKeyStore.ts'

const KEY = 'test_0123456789abcdef0123456789abcdef'

function stub(trades: Record<string, unknown[]>) {
  const fetchMock = vi.fn(async (input: string) => {
    const url = new URL(input)
    if (url.pathname === '/fconline/v1/user/trade') {
      return new Response(JSON.stringify(trades[url.searchParams.get('tradetype') ?? ''] ?? []), { status: 200 })
    }
    if (url.pathname.endsWith('/spid.json')) return new Response(JSON.stringify([{ id: 300000007, name: '손흥민' }]))
    if (url.pathname.endsWith('/class.json')) return new Response(JSON.stringify([]))
    return new Response('{}', { status: 404 })
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

describe('내 거래 기록', () => {
  it('키가 없으면 등록을 안내한다', () => {
    renderAt('/trade')
    expect(screen.getByText('API 키가 필요합니다')).toBeInTheDocument()
  })

  it('구매·판매 기록을 선수 이름, 강화, BP와 함께 보여준다', async () => {
    setApiKey(KEY)
    const fetchMock = stub({
      buy: [{ tradeDate: '2026-11-20T10:00:00', saleSn: 'b1', spid: 300000007, grade: 5, value: 1_234_500_000_000 }],
      sell: [],
    })
    const user = userEvent.setup()
    renderAt('/trade')

    const list = await screen.findByRole('list', { name: '구매 기록' })
    expect(await screen.findByText(/손흥민/)).toBeInTheDocument()
    expect(list).toHaveTextContent('+5')
    expect(list).toHaveTextContent('1조 2,345억 BP')
    const call = fetchMock.mock.calls.find(([u]) => String(u).includes('/user/trade'))
    expect(new URL(String(call?.[0])).searchParams.get('tradetype')).toBe('buy')

    await user.click(screen.getByRole('tab', { name: '판매' }))
    expect(await screen.findByText('판매 기록이 없습니다.')).toBeInTheDocument()
  })
})
