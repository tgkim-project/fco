import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import KeyRequiredNotice from '../components/KeyRequiredNotice.tsx'
import MatchList, { type MatchItem } from '../components/match/MatchList.tsx'
import MatchSummary from '../components/match/MatchSummary.tsx'
import UserSummary from '../components/match/UserSummary.tsx'
import { useApiKey } from '../hooks/useApiKey.ts'
import { useMeta } from '../hooks/useMeta.ts'
import { NexonApiError } from '../lib/nexon/errors.ts'
import { getMatchDetails, getMatchIds, getMaxDivision, getOuid, getUserBasic } from '../lib/nexon/fconline.ts'
import { toLookup } from '../lib/nexon/meta.ts'
import type { MatchTypeMeta, MaxDivision, UserBasic } from '../lib/nexon/types.ts'
import { addRecentNickname, getRecentNicknames, removeRecentNickname } from '../lib/recentSearches.ts'

const PAGE_SIZE = 10
const DEFAULT_MATCH_TYPE = 50
/** 메타데이터를 못 받았을 때 쓰는 기본 목록 */
const FALLBACK_MATCH_TYPES: MatchTypeMeta[] = [
  { matchtype: 50, desc: '공식경기' },
  { matchtype: 52, desc: '감독모드' },
  { matchtype: 40, desc: '클래식 1on1' },
  { matchtype: 60, desc: '공식 친선' },
]

interface Profile {
  ouid: string
  basic: UserBasic
  maxDivisions: MaxDivision[]
}

function errorMessage(error: unknown, context: 'profile' | 'matches'): string {
  if (error instanceof NexonApiError) {
    if (context === 'profile' && error.kind === 'bad-request') return '해당 닉네임의 유저를 찾을 수 없습니다.'
    return error.userMessage
  }
  return '알 수 없는 오류가 발생했습니다.'
}

export default function MatchPage() {
  const apiKey = useApiKey()
  const [params, setParams] = useSearchParams()
  const nickname = params.get('nickname')?.trim() ?? ''
  const matchType = Number(params.get('type')) || DEFAULT_MATCH_TYPE

  const [input, setInput] = useState(nickname)
  const [recent, setRecent] = useState(getRecentNicknames)

  function search(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    setInput(trimmed)
    const next = new URLSearchParams(params)
    next.set('nickname', trimmed)
    setParams(next)
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    search(input)
  }

  function handleMatchType(type: number) {
    const next = new URLSearchParams(params)
    next.set('type', String(type))
    setParams(next, { replace: true })
  }

  if (!apiKey) {
    return (
      <section className="page">
        <h1>전적 검색</h1>
        <KeyRequiredNotice />
      </section>
    )
  }

  return (
    <section className="page">
      <h1>전적 검색</h1>

      <form className="row" onSubmit={handleSubmit} role="search">
        <input
          aria-label="닉네임"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="닉네임 입력"
          autoCapitalize="off"
          spellCheck={false}
          className="grow"
        />
        <button type="submit">검색</button>
      </form>

      {!nickname && recent.length > 0 && (
        <div className="recent">
          <h2>최근 검색</h2>
          <ul className="chip-list">
            {recent.map((name) => (
              <li key={name} className="chip">
                <button type="button" className="link" onClick={() => search(name)}>
                  {name}
                </button>
                <button
                  type="button"
                  className="link muted"
                  aria-label={`${name} 최근 검색에서 삭제`}
                  onClick={() => setRecent(removeRecentNickname(name))}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {nickname && (
        <PlayerRecord
          key={nickname}
          apiKey={apiKey}
          nickname={nickname}
          matchType={matchType}
          onMatchType={handleMatchType}
          onFound={(name) => setRecent(addRecentNickname(name))}
        />
      )}
    </section>
  )
}

interface PlayerRecordProps {
  apiKey: string
  nickname: string
  matchType: number
  onMatchType: (type: number) => void
  onFound: (nickname: string) => void
}

/** 닉네임 하나의 전적. 닉네임이 바뀌면 key로 새로 만들어 상태가 초기화된다. */
function PlayerRecord({ apiKey, nickname, matchType, onMatchType, onFound }: PlayerRecordProps) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [error, setError] = useState<string | null>(null)

  const matchTypes = useMeta('matchtype')
  const divisions = useMeta('division')
  const voltaDivisions = useMeta('division-volta')

  const matchTypeList = matchTypes.data ?? FALLBACK_MATCH_TYPES
  const matchTypeNames = useMemo(() => toLookup(matchTypeList, (m) => m.matchtype, (m) => m.desc), [matchTypeList])
  const divisionNames = useMemo(
    () => toLookup(divisions.data ?? [], (d) => d.divisionId, (d) => d.divisionName),
    [divisions.data],
  )
  const voltaDivisionNames = useMemo(
    () => toLookup(voltaDivisions.data ?? [], (d) => d.divisionId, (d) => d.divisionName),
    [voltaDivisions.data],
  )

  useEffect(() => {
    let alive = true
    ;(async () => {
      const ctx = { apiKey }
      const ouid = await getOuid(ctx, nickname)
      const [basic, maxDivisions] = await Promise.all([getUserBasic(ctx, ouid), getMaxDivision(ctx, ouid)])
      return { ouid, basic, maxDivisions }
    })().then(
      (p) => {
        if (!alive) return
        setProfile(p)
        onFound(p.basic.nickname)
      },
      (e: unknown) => alive && setError(errorMessage(e, 'profile')),
    )
    return () => {
      alive = false
    }
    // onFound는 부모가 매 렌더 새로 만들므로 의존성에서 제외 (닉네임당 한 번만 기록)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, nickname])

  if (error) {
    return (
      <p className="feedback error" role="alert">
        {error}
      </p>
    )
  }
  if (!profile) return <p className="muted">유저 정보를 불러오는 중…</p>

  return (
    <>
      <UserSummary
        basic={profile.basic}
        maxDivisions={profile.maxDivisions}
        matchTypeNames={matchTypeNames}
        divisionNames={divisionNames}
        voltaDivisionNames={voltaDivisionNames}
      />

      <div className="row" role="tablist" aria-label="매치 종류">
        {matchTypeList.map((m) => (
          <button
            key={m.matchtype}
            type="button"
            role="tab"
            aria-selected={m.matchtype === matchType}
            className={m.matchtype === matchType ? '' : 'secondary'}
            onClick={() => onMatchType(m.matchtype)}
          >
            {m.desc}
          </button>
        ))}
      </div>

      <MatchHistory
        key={`${profile.ouid}:${matchType}`}
        apiKey={apiKey}
        ouid={profile.ouid}
        matchType={matchType}
        matchTypeName={matchTypeNames.get(matchType)}
      />
      <p className="muted small">데이터는 매시 정각, 두 시간 전 경기까지 반영됩니다. Data based on NEXON Open API</p>
    </>
  )
}

interface MatchHistoryProps {
  apiKey: string
  ouid: string
  matchType: number
  matchTypeName?: string
}

/** 한 유저·한 매치 종류의 경기 목록. 매치 종류가 바뀌면 key로 새로 만든다. */
function MatchHistory({ apiKey, ouid, matchType, matchTypeName }: MatchHistoryProps) {
  const [items, setItems] = useState<MatchItem[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  async function fetchPage(offset: number) {
    const ctx = { apiKey }
    const ids = await getMatchIds(ctx, ouid, { matchtype: matchType, offset, limit: PAGE_SIZE })
    return getMatchDetails(ctx, ids)
  }

  useEffect(() => {
    let alive = true
    const ctx = { apiKey }
    getMatchIds(ctx, ouid, { matchtype: matchType, offset: 0, limit: PAGE_SIZE })
      .then((ids) => getMatchDetails(ctx, ids))
      .then(
        (page) => {
          if (!alive) return
          setItems(page)
          setHasMore(page.length === PAGE_SIZE)
        },
        (e: unknown) => alive && setError(errorMessage(e, 'matches')),
      )
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [apiKey, ouid, matchType])

  async function handleMore() {
    setLoading(true)
    setError(null)
    try {
      const page = await fetchPage(items.length)
      setItems((prev) => [...prev, ...page])
      setHasMore(page.length === PAGE_SIZE)
    } catch (e) {
      setError(errorMessage(e, 'matches'))
    } finally {
      setLoading(false)
    }
  }

  const details = items.flatMap((i) => (i.detail ? [i.detail] : []))

  return (
    <>
      {details.length > 0 && <MatchSummary apiKey={apiKey} ouid={ouid} matchType={matchType} details={details} />}
      {items.length > 0 && (
        <MatchList
          ouid={ouid}
          items={items}
          expandedId={expandedId}
          onToggle={(id) => setExpandedId((cur) => (cur === id ? null : id))}
        />
      )}
      {!loading && !error && items.length === 0 && (
        <p className="muted">{matchTypeName ?? '이 매치 종류'} 경기 기록이 없습니다.</p>
      )}
      {loading && <p className="muted">경기 기록을 불러오는 중…</p>}
      {error && (
        <p className="feedback error" role="alert">
          {error}
        </p>
      )}
      {hasMore && !loading && (
        <button type="button" className="secondary" onClick={handleMore}>
          더 보기
        </button>
      )}
    </>
  )
}
