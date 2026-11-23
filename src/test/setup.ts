import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

// 테스트 중 실제 네트워크 호출 금지. 필요한 테스트는 vi.stubGlobal('fetch', ...)로 덮어쓴다.
beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      throw new TypeError('테스트에서는 네트워크를 쓰지 않습니다')
    }),
  )
})

// vitest globals를 쓰지 않으므로 Testing Library 자동 정리가 동작하지 않아 직접 등록
afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.unstubAllGlobals()
})
