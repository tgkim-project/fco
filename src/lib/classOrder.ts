import { CLASS_RELEASE_DATES } from '../data/classReleaseDates.ts'
import type { ClassMeta } from './nexon/types.ts'

/** 앱에서 숨기는 클래스: 110 ICON TM(제한) */
export const HIDDEN_CLASSES: ReadonlySet<number> = new Set([110])

/**
 * 클래스를 출시일 최신순으로 정렬한다.
 * - 출시일이 같으면 넥슨 class.json 순서(종류별 최신순)를 따른다
 * - 출시일을 모르는 클래스는 맨 뒤 (그 안에서는 class.json 순서)
 */
export function sortClassesByRelease(
  classes: ClassMeta[],
  dates: Record<number, string | null> = CLASS_RELEASE_DATES,
): ClassMeta[] {
  const apiOrder = new Map(classes.map((c, i) => [c.class, i]))
  return [...classes].sort((a, b) => {
    const da = dates[a.class] ?? null
    const db = dates[b.class] ?? null
    if (da && db && da !== db) return db.localeCompare(da)
    if (da && !db) return -1
    if (!da && db) return 1
    return (apiOrder.get(a.class) ?? 0) - (apiOrder.get(b.class) ?? 0)
  })
}

/** 클래스 → 정렬 순위 (작을수록 최신) */
export function classReleaseRank(classes: ClassMeta[], dates?: Record<number, string | null>): Map<number, number> {
  return new Map(sortClassesByRelease(classes, dates).map((c, i) => [c.class, i]))
}
