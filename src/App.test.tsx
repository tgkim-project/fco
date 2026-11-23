import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from './App.tsx'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('App 라우팅', () => {
  it('홈 화면과 하단 메뉴를 보여준다', () => {
    renderAt('/')
    expect(screen.getByRole('heading', { name: 'FC온라인 도우미' })).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: '주요 메뉴' })
    for (const label of ['홈', '전적', '선수', '스쿼드', '설정']) {
      expect(nav).toHaveTextContent(label)
    }
  })

  it('하단 메뉴로 각 화면에 이동한다', async () => {
    const user = userEvent.setup()
    renderAt('/')
    await user.click(screen.getByRole('link', { name: '스쿼드' }))
    expect(screen.getByRole('heading', { name: '스쿼드 메이커' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: '설정' }))
    expect(screen.getByRole('heading', { name: '설정' })).toBeInTheDocument()
  })

  it('홈에서 API 키 가이드로 이동할 수 있다', async () => {
    const user = userEvent.setup()
    renderAt('/')
    await user.click(screen.getByRole('link', { name: 'API 키 발급 가이드' }))
    expect(screen.getByRole('heading', { name: 'API 키 발급 가이드' })).toBeInTheDocument()
  })

  it('없는 주소는 홈으로 보낸다', () => {
    renderAt('/nope')
    expect(screen.getByRole('heading', { name: 'FC온라인 도우미' })).toBeInTheDocument()
  })
})
