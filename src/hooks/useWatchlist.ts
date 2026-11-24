import { useSyncExternalStore } from 'react'
import { getWatchlist, subscribeWatchlist, type WatchedUser } from '../lib/watchlist.ts'

const EMPTY: WatchedUser[] = []

/** 관심 유저 목록. 등록·삭제·확인 시 자동으로 다시 렌더링된다 */
export function useWatchlist(): WatchedUser[] {
  return useSyncExternalStore(subscribeWatchlist, getWatchlist, () => EMPTY)
}
