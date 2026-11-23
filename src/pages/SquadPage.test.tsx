import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App.tsx'
import { encodeSquad } from '../lib/squad/shareCode.ts'
import { loadSquads } from '../lib/squad/squadStore.ts'

const META: Record<string, unknown> = {
  'spid.json': [
    { id: 101000007, name: '손흥민' },
    { id: 300000007, name: '손흥민' },
    { id: 300000009, name: '김민재' },
  ],
  'class.json': [
    { class: 300, className: '26 LIVE (26 LIVE)', classImg: '' },
    { class: 101, className: 'ICON (ICON)', classImg: '' },
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

async function pickPlayer(user: ReturnType<typeof userEvent.setup>, slotLabel: RegExp, query: string, card: string) {
  await user.click(screen.getByRole('button', { name: slotLabel }))
  const dialog = await screen.findByRole('dialog')
  await user.type(within(dialog).getByRole('textbox', { name: '선수 이름' }), query)
  await user.click(await within(dialog).findByRole('button', { name: new RegExp(query) }))
  await user.click(within(dialog).getByRole('button', { name: card }))
}

describe('스쿼드 메이커', () => {
  it('빈 자리를 눌러 선수와 카드를 골라 넣고, 기기에 저장한다', async () => {
    const user = userEvent.setup()
    renderAt('/squad')
    expect(screen.getByText(/11명 중 0명/)).toBeInTheDocument()

    await pickPlayer(user, /^ST 비어 있음$/, '손흥민', '손흥민 26 LIVE')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'ST 손흥민' })).toBeInTheDocument()
    expect(screen.getByText(/11명 중 1명/)).toBeInTheDocument()
    expect(loadSquads()[0].slots).toContain(300000007)
  })

  it('자리 바꾸기로 두 선수 위치를 바꾼다', async () => {
    const user = userEvent.setup()
    renderAt('/squad')
    await pickPlayer(user, /^ST 비어 있음$/, '손흥민', '손흥민 26 LIVE')
    await pickPlayer(user, /^GK 비어 있음$/, '김민재', '김민재 26 LIVE')

    await user.click(await screen.findByRole('button', { name: 'ST 손흥민' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '자리 바꾸기' }))
    expect(screen.getByText(/ST 선수와 바꿀 자리를 누르세요/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'GK 김민재' }))

    expect(screen.getByRole('button', { name: 'GK 손흥민' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ST 김민재' })).toBeInTheDocument()
  })

  it('포메이션을 바꿔도 선수는 같은 순번 자리에 남는다', async () => {
    const user = userEvent.setup()
    renderAt('/squad')
    await pickPlayer(user, /^GK 비어 있음$/, '김민재', '김민재 26 LIVE')
    await user.selectOptions(screen.getByRole('combobox', { name: '포메이션' }), '4-4-2')
    expect(screen.getByRole('group', { name: '4-4-2 포메이션' })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'GK 김민재' })).toBeInTheDocument()
  })

  it('공유 링크로 열면 미리보기 후 내 스쿼드로 저장할 수 있다', async () => {
    const code = encodeSquad('4-3-3', [300000009])
    const user = userEvent.setup()
    renderAt(`/squad?s=${code}`)

    expect(screen.getByRole('heading', { name: '공유받은 스쿼드' })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'GK 김민재' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '내 스쿼드로 저장' }))

    expect(screen.getByRole('heading', { name: '스쿼드 메이커' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: '스쿼드 선택' })).toHaveDisplayValue('공유받은 스쿼드')
    expect(loadSquads().map((s) => s.name)).toEqual(['내 스쿼드 1', '공유받은 스쿼드'])
  })

  it('잘못된 공유 링크는 안내한다', () => {
    renderAt('/squad?s=broken')
    expect(screen.getByRole('alert')).toHaveTextContent('공유 링크가 올바르지 않습니다')
  })

  it('새 스쿼드를 만들고 확인 후 삭제한다', async () => {
    const user = userEvent.setup()
    renderAt('/squad')
    await user.click(screen.getByRole('button', { name: '새 스쿼드' }))
    expect(screen.getByRole('combobox', { name: '스쿼드 선택' })).toHaveDisplayValue('내 스쿼드 2')

    await user.click(screen.getByRole('button', { name: '스쿼드 삭제' }))
    await user.click(screen.getByRole('button', { name: '삭제 확인' }))
    expect(screen.getByRole('combobox', { name: '스쿼드 선택' })).toHaveDisplayValue('내 스쿼드 1')
    expect(loadSquads()).toHaveLength(1)
  })
})
