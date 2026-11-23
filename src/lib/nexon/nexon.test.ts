import { describe, expect, it, vi } from 'vitest'
import { nexonGet, type FetchLike } from './client.ts'
import { NexonApiError, toNexonApiError } from './errors.ts'
import { verifyApiKey } from './verifyApiKey.ts'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

function errorBody(name: string) {
  return { error: { name, message: 'msg' } }
}

describe('toNexonApiError', () => {
  it.each([
    [400, 'OPENAPI00005', 'invalid-key'],
    [403, 'OPENAPI00002', 'forbidden'],
    [429, 'OPENAPI00007', 'rate-limit'],
    [400, 'OPENAPI00004', 'bad-request'],
    [400, 'OPENAPI00010', 'maintenance'],
    [500, 'OPENAPI00001', 'server'],
  ])('%i %s → %s', (status, code, kind) => {
    const error = toNexonApiError(status, errorBody(code))
    expect(error.kind).toBe(kind)
    expect(error.code).toBe(code)
  })

  it('본문이 없으면 상태 코드로 판단한다', () => {
    expect(toNexonApiError(429, null).kind).toBe('rate-limit')
    expect(toNexonApiError(502, 'oops').kind).toBe('server')
  })
})

describe('nexonGet', () => {
  it('키를 x-nxopen-api-key 헤더로 보내고 쿼리를 붙인다', async () => {
    const fetchImpl = vi.fn<FetchLike>(async () => jsonResponse(200, { ouid: 'abc' }))
    const result = await nexonGet<{ ouid: string }>('/fconline/v1/id', {
      apiKey: 'KEY',
      params: { nickname: '닉네임', skip: undefined },
      fetchImpl,
    })
    expect(result).toEqual({ ouid: 'abc' })
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('https://open.api.nexon.com/fconline/v1/id?nickname=%EB%8B%89%EB%84%A4%EC%9E%84')
    expect(new Headers(init?.headers).get('x-nxopen-api-key')).toBe('KEY')
  })

  it('실패 응답은 NexonApiError로 던진다', async () => {
    const fetchImpl: FetchLike = async () => jsonResponse(400, errorBody('OPENAPI00005'))
    await expect(nexonGet('/x', { apiKey: 'K', fetchImpl })).rejects.toMatchObject({ kind: 'invalid-key' })
  })

  it('네트워크 오류는 network 종류로 바꾼다', async () => {
    const fetchImpl: FetchLike = async () => {
      throw new TypeError('Failed to fetch')
    }
    const error = await nexonGet('/x', { apiKey: 'K', fetchImpl }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(NexonApiError)
    expect((error as NexonApiError).kind).toBe('network')
  })
})

describe('verifyApiKey', () => {
  it.each([
    ['200 응답', 200, { ouid: 'abc' }, 'valid'],
    ['유저 없음(파라미터 오류)', 400, errorBody('OPENAPI00004'), 'valid'],
    ['잘못된 키', 400, errorBody('OPENAPI00005'), 'invalid'],
    ['권한 없음', 403, errorBody('OPENAPI00002'), 'invalid'],
    ['호출 한도 초과', 429, errorBody('OPENAPI00007'), 'unknown'],
    ['API 점검', 503, errorBody('OPENAPI00011'), 'unknown'],
  ])('%s → %s', async (_label, status, body, expected) => {
    const result = await verifyApiKey('KEY', async () => jsonResponse(status, body))
    expect(result.status).toBe(expected)
  })
})
