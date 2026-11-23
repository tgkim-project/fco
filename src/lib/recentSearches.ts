// 최근 검색한 닉네임 (기기에만 저장, 최대 10개)
const STORAGE_KEY = 'fco.recentNicknames'
const MAX = 10

export function getRecentNicknames(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
  } catch {
    return []
  }
}

function save(list: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    // 저장 실패는 무시
  }
}

/** 맨 앞에 추가하고 중복은 제거한다 */
export function addRecentNickname(nickname: string): string[] {
  const name = nickname.trim()
  if (!name) return getRecentNicknames()
  const next = [name, ...getRecentNicknames().filter((n) => n !== name)].slice(0, MAX)
  save(next)
  return next
}

export function removeRecentNickname(nickname: string): string[] {
  const next = getRecentNicknames().filter((n) => n !== nickname)
  save(next)
  return next
}
