import { describe, expect, it, vi } from 'vitest'
import { clearApiKey, getApiKey, maskApiKey, normalizeApiKey, setApiKey, subscribeApiKey } from './apiKeyStore.ts'

const SAMPLE_KEY = 'test_0123456789abcdef0123456789abcdef'

describe('apiKeyStore', () => {
  it('키를 저장·조회·삭제한다', () => {
    expect(getApiKey()).toBeNull()
    setApiKey(SAMPLE_KEY)
    expect(getApiKey()).toBe(SAMPLE_KEY)
    clearApiKey()
    expect(getApiKey()).toBeNull()
  })

  it('저장·삭제 시 구독자에게 알린다', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeApiKey(listener)
    setApiKey(SAMPLE_KEY)
    clearApiKey()
    expect(listener).toHaveBeenCalledTimes(2)
    unsubscribe()
    setApiKey(SAMPLE_KEY)
    expect(listener).toHaveBeenCalledTimes(2)
  })
})

describe('normalizeApiKey', () => {
  it('앞뒤 공백과 따옴표를 제거한다', () => {
    expect(normalizeApiKey(`  "${SAMPLE_KEY}"  `)).toEqual({ key: SAMPLE_KEY })
  })

  it('빈 값, 중간 공백, 너무 짧은 값은 거절한다', () => {
    expect(normalizeApiKey('   ')).toHaveProperty('error')
    expect(normalizeApiKey('abcd efgh ijkl mnop qrst')).toHaveProperty('error')
    expect(normalizeApiKey('short')).toHaveProperty('error')
  })
})

describe('maskApiKey', () => {
  it('앞 6자리와 끝 4자리만 보여준다', () => {
    const masked = maskApiKey(SAMPLE_KEY)
    expect(masked.startsWith('test_0')).toBe(true)
    expect(masked.endsWith('cdef')).toBe(true)
    expect(masked).not.toContain('6789abcdef0123')
  })
})
