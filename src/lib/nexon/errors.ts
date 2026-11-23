// NEXON Open API 오류 코드 → 앱에서 쓰는 오류 종류와 한국어 안내
// 출처: https://openapi.nexon.com/ko/guide/request-api/ (에러 코드 표)

export type NexonErrorKind =
  | 'invalid-key'
  | 'forbidden'
  | 'bad-request'
  | 'rate-limit'
  | 'data-preparing'
  | 'maintenance'
  | 'server'
  | 'network'

const CODE_KIND: Record<string, NexonErrorKind> = {
  OPENAPI00001: 'server',
  OPENAPI00002: 'forbidden',
  OPENAPI00003: 'bad-request',
  OPENAPI00004: 'bad-request',
  OPENAPI00005: 'invalid-key',
  OPENAPI00006: 'bad-request',
  OPENAPI00007: 'rate-limit',
  OPENAPI00009: 'data-preparing',
  OPENAPI00010: 'maintenance',
  OPENAPI00011: 'maintenance',
}

const KIND_MESSAGE: Record<NexonErrorKind, string> = {
  'invalid-key': 'API 키가 올바르지 않습니다. 키를 다시 확인해 주세요.',
  forbidden:
    '이 API 키로는 FC온라인 데이터를 조회할 권한이 없습니다. 애플리케이션의 게임이 "FC 온라인"인지 확인해 주세요.',
  'bad-request': '요청이 올바르지 않거나 찾는 데이터가 없습니다.',
  'rate-limit': 'API 호출 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.',
  'data-preparing': '데이터를 준비 중입니다. 잠시 후 다시 시도해 주세요.',
  maintenance: '게임 또는 API 점검 중입니다. 점검이 끝난 뒤 다시 시도해 주세요.',
  server: 'NEXON Open API 서버에 문제가 있습니다. 잠시 후 다시 시도해 주세요.',
  network: '네트워크에 연결할 수 없습니다. 인터넷 연결을 확인해 주세요.',
}

export class NexonApiError extends Error {
  readonly kind: NexonErrorKind
  readonly status: number | null
  readonly code: string | null

  constructor(kind: NexonErrorKind, status: number | null, code: string | null, detail?: string) {
    super(detail ?? KIND_MESSAGE[kind])
    this.name = 'NexonApiError'
    this.kind = kind
    this.status = status
    this.code = code
  }

  /** 사용자에게 보여줄 한국어 안내 */
  get userMessage(): string {
    return KIND_MESSAGE[this.kind]
  }
}

function kindFromStatus(status: number): NexonErrorKind {
  if (status === 429) return 'rate-limit'
  if (status === 403) return 'forbidden'
  if (status === 503) return 'maintenance'
  if (status >= 500) return 'server'
  return 'bad-request'
}

/** 실패 응답(상태 코드 + 본문)을 NexonApiError로 변환 */
export function toNexonApiError(status: number, body: unknown): NexonApiError {
  const error =
    body && typeof body === 'object' && 'error' in body
      ? (body as { error?: { name?: unknown; message?: unknown } }).error
      : undefined
  const code = typeof error?.name === 'string' ? error.name : null
  const message = typeof error?.message === 'string' ? error.message : undefined
  const kind = (code && CODE_KIND[code]) || kindFromStatus(status)
  return new NexonApiError(kind, status, code, message)
}
