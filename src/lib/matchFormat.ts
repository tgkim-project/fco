// 전적 화면 표시용 포맷 함수

/** API 날짜(UTC0, 시간대 표기 없음)를 기기 시간대 Date로 */
export function parseApiDate(value: string): Date {
  const hasZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(value)
  return new Date(hasZone ? value : `${value}Z`)
}

export function formatMatchDate(value: string, now: Date = new Date()): string {
  const date = parseApiDate(value)
  if (Number.isNaN(date.getTime())) return value
  const sameYear = date.getFullYear() === now.getFullYear()
  return date.toLocaleString('ko-KR', {
    year: sameYear ? undefined : 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const HALF_UNIT = 2 ** 24
const HALF_START_MINUTE = [0, 45, 90, 105, 120]

/**
 * goalTime → "73'" 형태.
 * 값이 2^24 단위로 전반/후반/연장 구간을 나타내고 나머지가 구간 안의 초라는 커뮤니티 해석을 따른다.
 * (넥슨 명세에 설명이 없어 실제 경기와 대조 확인 필요)
 */
export function formatGoalTime(goalTime: number): string {
  const half = Math.floor(goalTime / HALF_UNIT)
  const seconds = goalTime % HALF_UNIT
  const base = HALF_START_MINUTE[half] ?? 0
  return `${base + Math.floor(seconds / 60) + 1}'`
}

export function percent(success: number, attempts: number): string {
  if (!attempts) return '-'
  return `${Math.round((success / attempts) * 100)}%`
}

export function rating(value: number | undefined): string {
  return typeof value === 'number' && value > 0 ? value.toFixed(1) : '-'
}
