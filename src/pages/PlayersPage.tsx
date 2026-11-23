import { useDeferredValue, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import PlayerImage from '../components/PlayerImage.tsx'
import { useMeta } from '../hooks/useMeta.ts'
import { classReleaseRank, sortClassesByRelease } from '../lib/classOrder.ts'
import { classOfSpid } from '../lib/nexon/meta.ts'
import type { ClassMeta } from '../lib/nexon/types.ts'
import { buildPlayerIndex, searchPlayers, type PlayerGroup } from '../lib/playerSearch.ts'

const PAGE_SIZE = 30
const MAX_BADGES = 6
/** 선수 검색에서 숨기는 클래스: 110 ICON TM(제한) */
const HIDDEN_CLASSES = new Set([110])

/** "ICON TM (ICON The Moment)" → "ICON TM" */
function shortClassName(name: string) {
  return name.replace(/\s*\(.*\)$/, '')
}

export default function PlayersPage() {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const classParam = params.get('class')
  const classId = classParam ? Number(classParam) : null

  // 검색창 값은 주소(q)를 그대로 쓴다 → 링크·뒤로 가기로 주소가 바뀌어도 검색창이 맞춰진다
  const input = query
  const deferredInput = useDeferredValue(input)
  const [limit, setLimit] = useState(PAGE_SIZE)
  const [expandedPid, setExpandedPid] = useState<number | null>(null)

  const spid = useMeta('spid')
  const classes = useMeta('class')

  const index = useMemo(
    () => (spid.data ? buildPlayerIndex(spid.data.filter((p) => !HIDDEN_CLASSES.has(classOfSpid(p.id)))) : null),
    [spid.data],
  )
  const classMap = useMemo(() => new Map((classes.data ?? []).map((c) => [c.class, c])), [classes.data])
  /** 출시일 최신순 순위 (드롭다운·카드·배지 정렬에 사용) */
  const classRank = useMemo(() => classReleaseRank(classes.data ?? []), [classes.data])
  // Open API에는 클래스 출시일이 없어 별도 조사한 출시일(src/data/classReleaseDates.ts)로 최신순 정렬한다.
  // 클래스 번호는 출시 순서와 맞지 않아 정렬 기준으로 쓰지 않는다.
  const classOptions = useMemo(
    () => sortClassesByRelease((classes.data ?? []).filter((c) => !HIDDEN_CLASSES.has(c.class))),
    [classes.data],
  )

  const results = useMemo(
    () => (index ? searchPlayers(index, deferredInput, { classId, limit: limit + 1 }) : []),
    [index, deferredInput, classId, limit],
  )
  const visible = results.slice(0, limit)
  const hasMore = results.length > limit

  function updateParams(next: { q?: string; class?: number | null }) {
    const p = new URLSearchParams(params)
    if (next.q !== undefined) {
      if (next.q) p.set('q', next.q)
      else p.delete('q')
    }
    if (next.class !== undefined) {
      if (next.class != null) p.set('class', String(next.class))
      else p.delete('class')
    }
    setParams(p, { replace: true })
  }

  function handleInput(value: string) {
    setLimit(PAGE_SIZE)
    setExpandedPid(null)
    // 입력 중 띄어쓰기가 지워지지 않도록 trim하지 않는다 (검색할 때 정규화됨)
    updateParams({ q: value })
  }

  function handleClass(value: string) {
    setLimit(PAGE_SIZE)
    setExpandedPid(null)
    updateParams({ class: value ? Number(value) : null })
  }

  return (
    <section className="page">
      <h1>선수 검색</h1>

      <div className="panel">
        <input
          aria-label="선수 이름"
          value={input}
          onChange={(e) => handleInput(e.target.value)}
          placeholder="선수 이름 (초성 검색 가능: ㅅㅎㅁ)"
          autoCapitalize="off"
          spellCheck={false}
        />
        <select aria-label="클래스" value={classId ?? ''} onChange={(e) => handleClass(e.target.value)}>
          <option value="">모든 클래스</option>
          {classOptions.map((c) => (
            <option key={c.class} value={c.class}>
              {c.className}
            </option>
          ))}
        </select>
      </div>

      {spid.loading && <p className="muted">선수 목록을 불러오는 중… (처음 한 번은 몇 MB를 받습니다)</p>}
      {spid.error ? (
        <p className="feedback error" role="alert">
          선수 목록을 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.
        </p>
      ) : null}

      {index && !deferredInput.trim() && classId == null && (
        <p className="muted">이름을 입력하거나 클래스를 골라 주세요. 선수 {index.length.toLocaleString()}명</p>
      )}
      {index && (deferredInput.trim() || classId != null) && visible.length === 0 && (
        <p className="muted">검색 결과가 없습니다.</p>
      )}

      <ul className="player-list">
        {visible.map((g) => (
          <PlayerRow
            key={g.pid}
            group={g}
            classId={classId}
            classMap={classMap}
            classRank={classRank}
            expanded={expandedPid === g.pid}
            onToggle={() => setExpandedPid((cur) => (cur === g.pid ? null : g.pid))}
          />
        ))}
      </ul>

      {hasMore && (
        <button type="button" className="secondary" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
          더 보기
        </button>
      )}
      <p className="muted small">Data based on NEXON Open API</p>
    </section>
  )
}

interface RowProps {
  group: PlayerGroup
  classId: number | null
  classMap: Map<number, ClassMeta>
  classRank: Map<number, number>
  expanded: boolean
  onToggle: () => void
}

function PlayerRow({ group, classId, classMap, classRank, expanded, onToggle }: RowProps) {
  // 출시일 최신순으로 정렬, 순위가 없는 클래스는 뒤로
  const rank = (spid: number) => classRank.get(classOfSpid(spid)) ?? Number.MAX_SAFE_INTEGER
  const spids = [...group.spids].sort((a, b) => rank(a) - rank(b))
  // 클래스 필터가 있으면 그 카드를 대표로
  const mainSpid = (classId != null && spids.find((s) => classOfSpid(s) === classId)) || spids[0]
  const badges = spids.slice(0, MAX_BADGES)

  return (
    <li className="player-row">
      <button type="button" className="player-summary" aria-expanded={expanded} onClick={onToggle}>
        <PlayerImage spid={mainSpid} alt="" />
        <span className="player-name">{group.name}</span>
        <span className="badges" aria-label={`카드 ${group.spids.length}장`}>
          {badges.map((s) => (
            <ClassBadge key={s} meta={classMap.get(classOfSpid(s))} classId={classOfSpid(s)} />
          ))}
          {group.spids.length > MAX_BADGES && <span className="muted small">+{group.spids.length - MAX_BADGES}</span>}
        </span>
      </button>
      {expanded && (
        <ul className="card-grid" aria-label={`${group.name} 카드 목록`}>
          {spids.map((s) => {
            const meta = classMap.get(classOfSpid(s))
            return (
              <li key={s} className="player-card">
                <PlayerImage spid={s} alt={`${group.name} ${meta ? shortClassName(meta.className) : ''}`} size={64} />
                <ClassBadge meta={meta} classId={classOfSpid(s)} />
              </li>
            )
          })}
        </ul>
      )}
    </li>
  )
}

function ClassBadge({ meta, classId }: { meta?: ClassMeta; classId: number }) {
  if (meta?.classImg) {
    return (
      <img
        className="class-badge"
        src={meta.classImg}
        alt={shortClassName(meta.className)}
        title={meta.className}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    )
  }
  return <span className="class-badge text">{meta ? shortClassName(meta.className) : classId}</span>
}
