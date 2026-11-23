import { NexonApiError, toNexonApiError } from './errors.ts'

export const NEXON_API_BASE = 'https://open.api.nexon.com'

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

export interface NexonRequestOptions {
  apiKey: string
  params?: Record<string, string | number | undefined>
  fetchImpl?: FetchLike
  signal?: AbortSignal
}

/**
 * NEXON Open API GET 요청. 성공 시 JSON, 실패 시 NexonApiError를 던진다.
 * 브라우저에서 직접 호출 가능(CORS 허용 확인). 앱(Capacitor)에서는 7단계에서 네이티브 HTTP로 교체 예정.
 */
export async function nexonGet<T>(path: string, options: NexonRequestOptions): Promise<T> {
  const { apiKey, params = {}, fetchImpl = fetch, signal } = options
  const url = new URL(path, NEXON_API_BASE)
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value))
  }

  let response: Response
  try {
    response = await fetchImpl(url.toString(), {
      headers: { 'x-nxopen-api-key': apiKey, accept: 'application/json' },
      signal,
    })
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause
    throw new NexonApiError('network', null, null)
  }

  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) throw toNexonApiError(response.status, body)
  return body as T
}
