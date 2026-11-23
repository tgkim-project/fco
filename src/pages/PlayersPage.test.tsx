import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App.tsx'
import PlayerImage from '../components/PlayerImage.tsx'

const META: Record<string, unknown> = {
  'spid.json': [
    { id: 101000007, name: '손흥민' },
    { id: 300000007, name: '손흥민' },
    { id: 300000009, name: '김민재' },
    // ICON TM(제한) 카드만 있는 선수 → 숨겨져야 함
    { id: 110000005, name: '제한선수' },
  ],
  // 알파벳순과 다른 순서로 두어, 넥슨이 준 순서를 그대로 쓰는지 확인한다
  'class.json': [
    { class: 300, className: 'LIVE (Live)', classImg: '' },
    { class: 101, className: 'ICON (ICON)', classImg: 'https://example.test/icon.png' },
    { class: 110, className: 'ICON TM(제한) (ICON The Moment Bound)', classImg: '' },
  ],
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string) => {
      const name = input.split('/').pop() ?? ''
      return name in META
        ? new Response(JSON.stringify(META[name]), { status: 200 })
        : new Response('{}', { status: 404 })
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

describe('선수 검색 화면', () => {
  it('초성으로 찾고 카드 목록을 펼친다', async () => {
    const user = userEvent.setup()
    renderAt('/players')
    expect(await screen.findByText(/선수 2명/)).toBeInTheDocument()

    await user.type(screen.getByRole('textbox', { name: '선수 이름' }), 'ㅅㅎㅁ')
    const row = await screen.findByRole('button', { name: /손흥민/ })
    expect(screen.queryByRole('button', { name: /김민재/ })).not.toBeInTheDocument()

    await user.click(row)
    const cards = screen.getByRole('list', { name: '손흥민 카드 목록' })
    expect(within(cards).getAllByRole('listitem')).toHaveLength(2)
    expect(within(cards).queryByText(/spid|101000007/)).not.toBeInTheDocument()
  })

  it('클래스만 골라도 그 클래스 선수를 보여준다', async () => {
    const user = userEvent.setup()
    renderAt('/players')
    await screen.findByText(/선수 2명/)
    await user.selectOptions(await screen.findByRole('combobox', { name: '클래스' }), '101')
    expect(await screen.findByRole('button', { name: /손흥민/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /김민재/ })).not.toBeInTheDocument()
  })

  it('클래스 목록은 넥슨이 준 순서(최신순) 그대로 보여준다', async () => {
    renderAt('/players')
    const select = await screen.findByRole('combobox', { name: '클래스' })
    await screen.findByRole('option', { name: 'ICON (ICON)' })
    expect([...select.querySelectorAll('option')].map((o) => o.textContent)).toEqual([
      '모든 클래스',
      'LIVE (Live)',
      'ICON (ICON)',
    ])
  })

  it('카드 목록에는 클래스 이름 글자 없이 배지만 보여준다', async () => {
    const user = userEvent.setup()
    renderAt('/players?q=손흥민')
    await user.click(await screen.findByRole('button', { name: /손흥민/ }))
    const cards = screen.getByRole('list', { name: '손흥민 카드 목록' })
    expect(within(cards).getByRole('img', { name: 'ICON' })).toHaveAttribute('src', 'https://example.test/icon.png')
    expect(within(cards).queryByText('ICON')).not.toBeInTheDocument()
    // 카드도 넥슨 클래스 순서(LIVE → ICON)대로
    // (LIVE는 배지 이미지가 없어 글자 배지)
    expect(within(cards).getAllByRole('img').map((img) => img.getAttribute('alt'))).toEqual([
      '손흥민 LIVE',
      '손흥민 ICON',
      'ICON',
    ])
  })

  it('ICON TM(제한) 클래스는 목록과 검색에서 숨긴다', async () => {
    renderAt('/players?q=제한선수')
    expect(await screen.findByText('검색 결과가 없습니다.')).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /제한/ })).not.toBeInTheDocument()
  })

  it('주소의 검색어로 시작할 수 있다', async () => {
    renderAt('/players?q=김민재')
    expect(await screen.findByRole('button', { name: /김민재/ })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: '선수 이름' })).toHaveValue('김민재')
  })

  it('주소가 바깥에서 바뀌면(링크·뒤로 가기) 검색창도 따라간다', async () => {
    function GoTo() {
      const navigate = useNavigate()
      return (
        <button type="button" onClick={() => navigate('/players?q=김민재')}>
          링크 이동
        </button>
      )
    }
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/players?q=손흥민']}>
        <App />
        <GoTo />
      </MemoryRouter>,
    )
    const box = screen.getByRole('textbox', { name: '선수 이름' })
    expect(box).toHaveValue('손흥민')
    await user.click(screen.getByRole('button', { name: '링크 이동' }))
    expect(box).toHaveValue('김민재')
    expect(await screen.findByRole('button', { name: /김민재/ })).toBeInTheDocument()
  })

  it('입력한 글자가 그대로 한 번만 들어간다', async () => {
    const user = userEvent.setup()
    renderAt('/players')
    const box = screen.getByRole('textbox', { name: '선수 이름' })
    await user.type(box, '손흥민')
    expect(box).toHaveValue('손흥민')
  })

  it('띄어쓰기를 포함해 입력할 수 있다', async () => {
    const user = userEvent.setup()
    renderAt('/players')
    await screen.findByText(/선수 2명/)
    await user.type(screen.getByRole('textbox', { name: '선수 이름' }), '손 흥')
    expect(screen.getByRole('textbox', { name: '선수 이름' })).toHaveValue('손 흥')
    expect(await screen.findByRole('button', { name: /손흥민/ })).toBeInTheDocument()
  })

  it('검색 결과가 없으면 안내한다', async () => {
    const user = userEvent.setup()
    renderAt('/players')
    await screen.findByText(/선수 2명/)
    await user.type(screen.getByRole('textbox', { name: '선수 이름' }), '없는선수')
    expect(await screen.findByText('검색 결과가 없습니다.')).toBeInTheDocument()
  })
})

describe('PlayerImage', () => {
  it('이미지가 없으면 다음 주소, 모두 실패하면 빈 자리를 보여준다', () => {
    render(<PlayerImage spid={101000007} alt="손흥민" />)
    const img = screen.getByRole('img', { name: '손흥민' })
    expect(img).toHaveAttribute('src', expect.stringContaining('/players/p101000007.png'))
    fireEvent.error(img)
    expect(screen.getByRole('img', { name: '손흥민' })).toHaveAttribute('src', expect.stringContaining('/players/p7.png'))
    fireEvent.error(screen.getByRole('img', { name: '손흥민' }))
    expect(screen.getByRole('img', { name: '손흥민' })).toHaveTextContent('?')
  })
})
