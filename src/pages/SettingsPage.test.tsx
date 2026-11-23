import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../App.tsx'
import { getApiKey, setApiKey } from '../lib/apiKeyStore.ts'

const VALID_KEY = 'test_0123456789abcdef0123456789abcdef'

function mockFetchOnce(status: number, body: unknown) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status }))
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

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('설정 화면 API 키', () => {
  it('유효한 키를 확인 후 저장하고 가려서 보여준다', async () => {
    const fetchMock = mockFetchOnce(400, { error: { name: 'OPENAPI00004', message: 'x' } })
    const user = userEvent.setup()
    renderAt('/settings')

    await user.type(screen.getByLabelText('API 키 입력'), `  ${VALID_KEY} `)
    await user.click(screen.getByRole('button', { name: '확인 후 저장' }))

    expect(await screen.findByText(/API 키를 저장했습니다/)).toBeInTheDocument()
    expect(getApiKey()).toBe(VALID_KEY)
    expect(screen.getByTestId('saved-key')).not.toHaveTextContent(VALID_KEY)
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('잘못된 키는 저장하지 않고 오류를 보여준다', async () => {
    mockFetchOnce(400, { error: { name: 'OPENAPI00005', message: 'The apikey is not valid.' } })
    const user = userEvent.setup()
    renderAt('/settings')

    await user.type(screen.getByLabelText('API 키 입력'), VALID_KEY)
    await user.click(screen.getByRole('button', { name: '확인 후 저장' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('API 키가 올바르지 않습니다')
    expect(getApiKey()).toBeNull()
  })

  it('네트워크 오류여도 키는 저장하고 경고를 보여준다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      }),
    )
    const user = userEvent.setup()
    renderAt('/settings')

    await user.type(screen.getByLabelText('API 키 입력'), VALID_KEY)
    await user.click(screen.getByRole('button', { name: '확인 후 저장' }))

    expect(await screen.findByText(/확인하지 못했습니다/)).toBeInTheDocument()
    expect(getApiKey()).toBe(VALID_KEY)
  })

  it('형식이 잘못된 입력은 API를 호출하지 않는다', async () => {
    const fetchMock = mockFetchOnce(200, {})
    const user = userEvent.setup()
    renderAt('/settings')

    await user.type(screen.getByLabelText('API 키 입력'), 'short')
    await user.click(screen.getByRole('button', { name: '확인 후 저장' }))

    expect(screen.getByRole('alert')).toHaveTextContent('너무 짧습니다')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('저장된 키를 확인 단계를 거쳐 삭제한다', async () => {
    setApiKey(VALID_KEY)
    const user = userEvent.setup()
    renderAt('/settings')

    await user.click(screen.getByRole('button', { name: '키 삭제' }))
    expect(getApiKey()).toBe(VALID_KEY)
    await user.click(screen.getByRole('button', { name: '삭제 확인' }))

    expect(getApiKey()).toBeNull()
    expect(screen.getByText('등록된 키가 없습니다.')).toBeInTheDocument()
  })
})

describe('키 필요 안내', () => {
  it('키가 없으면 전적 화면에서 등록을 안내한다', () => {
    renderAt('/match')
    expect(screen.getByText('API 키가 필요합니다')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '키 등록하기' })).toHaveAttribute('href', '/settings')
  })

  it('키가 있으면 안내를 숨긴다', () => {
    setApiKey(VALID_KEY)
    renderAt('/match')
    expect(screen.queryByText('API 키가 필요합니다')).not.toBeInTheDocument()
  })
})
