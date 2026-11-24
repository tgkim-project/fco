import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import KeyRequiredNotice from '../components/KeyRequiredNotice.tsx'
import { useApiKey } from '../hooks/useApiKey.ts'
import { useWatchlist } from '../hooks/useWatchlist.ts'
import { NexonApiError } from '../lib/nexon/errors.ts'
import {
  addWatchedUser,
  checkWatchedUser,
  markWatchedSeen,
  newMatchCount,
  removeWatchedUser,
  totalNewMatches,
  WATCH_DEPTH,
  WATCH_LIMIT,
  WATCH_MATCH_TYPES,
  WatchlistFullError,
  type WatchedUser,
} from '../lib/watchlist.ts'

const MATCH_TYPE_NAMES: Record<number, string> = { 50: '공식경기', 52: '감독모드' }
/** 화면을 열 때 자동으로 다시 확인하는 최소 간격 */
const AUTO_CHECK_INTERVAL = 10 * 60 * 1000

function countLabel(n: number) {
  return n >= WATCH_DEPTH ? `${WATCH_DEPTH}+` : String(n)
}

function relativeTime(ts: number, now = Date.now()) {
  const min = Math.round((now - ts) / 60000)
  if (min < 1) return '방금'
  if (min < 60) return `${min}분 전`
  const hour = Math.round(min / 60)
  if (hour < 24) return `${hour}시간 전`
  return `${Math.round(hour / 24)}일 전`
}

function errorText(e: unknown) {
  if (e instanceof WatchlistFullError) return e.message
  if (e instanceof NexonApiError) {
    return e.kind === 'bad-request' ? '해당 닉네임의 유저를 찾을 수 없습니다.' : e.userMessage
  }
  return '알 수 없는 오류가 발생했습니다.'
}

export default function WatchPage() {
  const apiKey = useApiKey()
  const list = useWatchlist()
  const [input, setInput] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)
  const autoChecked = useRef(false)

  async function checkAll(users: WatchedUser[]) {
    if (!apiKey || users.length === 0) return
    setChecking(true)
    setError(null)
    try {
      for (const u of users) await checkWatchedUser({ apiKey }, u.ouid)
    } catch (e) {
      setError(errorText(e))
    } finally {
      setChecking(false)
    }
  }

  // 화면을 열면 오래된 항목만 한 번 자동 확인
  useEffect(() => {
    if (autoChecked.current || !apiKey) return
    autoChecked.current = true
    const stale = list.filter((u) => Date.now() - u.lastCheckedAt > AUTO_CHECK_INTERVAL)
    if (stale.length) void checkAll(stale)
    // 처음 한 번만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey])

  async function handleAdd(event: FormEvent) {
    event.preventDefault()
    const name = input.trim()
    if (!name || !apiKey) return
    setAdding(true)
    setError(null)
    try {
      await addWatchedUser({ apiKey }, name)
      setInput('')
    } catch (e) {
      setError(errorText(e))
    } finally {
      setAdding(false)
    }
  }

  if (!apiKey) {
    return (
      <section className="page">
        <h1>관심 유저</h1>
        <KeyRequiredNotice />
      </section>
    )
  }

  return (
    <section className="page">
      <h1>관심 유저</h1>
      <p className="muted small">
        친구나 좋아하는 선수(프로게이머)의 닉네임을 등록해 두면, 확인할 때마다 새로 기록된 경기 수를 알려 줍니다. 최대{' '}
        {WATCH_LIMIT}명.
      </p>
      <div className="notice" role="note" aria-label="갱신 안내">
        <strong>경기 결과는 바로 갱신되지 않습니다</strong>
        <p>
          넥슨이 경기 기록을 매시 정각에 두 시간 전 경기까지 반영하기 때문에, 경기가 끝나고 보통 2~3시간 뒤에 새 경기로
          잡힙니다. 방금 끝난 경기가 안 보여도 정상입니다.
        </p>
      </div>

      <form className="row" onSubmit={handleAdd}>
        <input
          aria-label="등록할 닉네임"
          className="grow"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="닉네임 입력"
          autoCapitalize="off"
          spellCheck={false}
        />
        <button type="submit" disabled={adding || !input.trim()}>
          {adding ? '등록 중…' : '등록'}
        </button>
      </form>
      {error && (
        <p className="feedback error" role="alert">
          {error}
        </p>
      )}

      {list.length === 0 ? (
        <p className="muted">등록한 관심 유저가 없습니다.</p>
      ) : (
        <>
          <div className="row">
            <span className="muted small grow">{checking ? '새 경기를 확인하는 중…' : `${list.length}명`}</span>
            <button type="button" className="secondary" onClick={() => checkAll(list)} disabled={checking}>
              지금 확인
            </button>
          </div>
          <ul className="player-list" aria-label="관심 유저 목록">
            {list.map((u) => {
              const total = totalNewMatches(u)
              const firstNewType = WATCH_MATCH_TYPES.find((t) => newMatchCount(u.types[t]) > 0) ?? 50
              return (
                <li key={u.ouid} className="player-row watch-row">
                  <div className="player-summary">
                    <span className="player-name">{u.nickname}</span>
                    {total > 0 ? (
                      <span className="new-badge">새 경기 {countLabel(total)}</span>
                    ) : (
                      <span className="muted small">새 경기 없음</span>
                    )}
                  </div>
                  <div className="row watch-detail">
                    <span className="muted small grow">
                      {WATCH_MATCH_TYPES.map((t) => `${MATCH_TYPE_NAMES[t]} ${countLabel(newMatchCount(u.types[t]))}`).join(
                        ' · ',
                      )}{' '}
                      · {relativeTime(u.lastCheckedAt)} 확인
                    </span>
                    <Link
                      className="button"
                      to={`/match?nickname=${encodeURIComponent(u.nickname)}&type=${firstNewType}`}
                      onClick={() => markWatchedSeen(u.ouid)}
                    >
                      전적 보기
                    </Link>
                    {confirmRemove === u.ouid ? (
                      <>
                        <button type="button" className="danger" onClick={() => removeWatchedUser(u.ouid)}>
                          삭제 확인
                        </button>
                        <button type="button" className="secondary" onClick={() => setConfirmRemove(null)}>
                          취소
                        </button>
                      </>
                    ) : (
                      <button type="button" className="secondary" onClick={() => setConfirmRemove(u.ouid)}>
                        삭제
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}

      <p className="muted small">
        공식경기·감독모드만 확인합니다. 앱 버전에서는 새 경기를 알림으로 받을 수 있게 할 예정입니다(알림도 같은 이유로
        2~3시간 늦게 옵니다).
      </p>
    </section>
  )
}
