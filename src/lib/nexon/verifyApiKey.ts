import { nexonGet, type FetchLike } from './client.ts'
import { NexonApiError } from './errors.ts'

// 키 확인용 닉네임. 실제로 없어도 되며, 키가 유효하면 "유저 없음/파라미터" 계열 400이 온다.
const PROBE_NICKNAME = 'fco키확인'

export type VerifyResult =
  | { status: 'valid' }
  | { status: 'invalid'; error: NexonApiError }
  /** 네트워크·점검·한도 등으로 키 자체를 판단하지 못함 */
  | { status: 'unknown'; error: NexonApiError }

/**
 * 계정 식별자 조회 API를 한 번 호출해 키를 확인한다.
 * - OPENAPI00005(유효하지 않은 키), 00002(권한 없음) → invalid
 * - 200 또는 그 밖의 400(유저 없음 등) → valid
 * - 네트워크·한도·점검·서버 오류 → unknown
 */
export async function verifyApiKey(apiKey: string, fetchImpl?: FetchLike): Promise<VerifyResult> {
  try {
    await nexonGet('/fconline/v1/id', { apiKey, params: { nickname: PROBE_NICKNAME }, fetchImpl })
    return { status: 'valid' }
  } catch (error) {
    if (!(error instanceof NexonApiError)) throw error
    if (error.kind === 'invalid-key' || error.kind === 'forbidden') return { status: 'invalid', error }
    if (error.kind === 'bad-request') return { status: 'valid' }
    return { status: 'unknown', error }
  }
}
