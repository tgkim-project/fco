import { useSyncExternalStore } from 'react'
import { getApiKey, subscribeApiKey } from '../lib/apiKeyStore.ts'

/** 저장된 API 키(없으면 null). 저장/삭제 시 자동으로 다시 렌더링된다. */
export function useApiKey(): string | null {
  return useSyncExternalStore(subscribeApiKey, getApiKey, () => null)
}
