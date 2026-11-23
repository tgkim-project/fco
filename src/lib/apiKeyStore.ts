// 사용자의 NEXON Open API 키를 기기에만 저장한다. (웹: localStorage)
// 7단계에서 앱(Capacitor)용 보안 저장소로 바꿀 수 있도록 키 접근은 이 모듈로만 한다.

const STORAGE_KEY = 'fco.nexonApiKey'

type Listener = () => void
const listeners = new Set<Listener>()

function notify() {
  for (const listener of listeners) listener()
}

export function getApiKey(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function setApiKey(key: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, key)
  } finally {
    notify()
  }
}

export function clearApiKey(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } finally {
    notify()
  }
}

export function subscribeApiKey(listener: Listener): () => void {
  listeners.add(listener)
  // 다른 탭에서 바뀐 경우도 반영
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) listener()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

const QUOTES = /^["'`]+|["'`]+$/g

/** 입력값 정리: 앞뒤 공백·따옴표 제거. 형식이 명백히 잘못되면 오류 메시지 반환 */
export function normalizeApiKey(raw: string): { key: string } | { error: string } {
  const key = raw.trim().replace(QUOTES, '')
  if (!key) return { error: 'API 키를 입력해 주세요.' }
  if (/\s/.test(key)) return { error: 'API 키에 공백이 들어 있습니다. 복사한 값을 다시 확인해 주세요.' }
  if (key.length < 16) return { error: 'API 키가 너무 짧습니다. 전체 값을 복사했는지 확인해 주세요.' }
  return { key }
}

/** 화면 표시용: 앞 6자리와 끝 4자리만 보여준다 */
export function maskApiKey(key: string): string {
  if (key.length <= 10) return '•'.repeat(key.length)
  return `${key.slice(0, 6)}${'•'.repeat(8)}${key.slice(-4)}`
}
