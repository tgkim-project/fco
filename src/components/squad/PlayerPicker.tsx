import { useDeferredValue, useState } from 'react'
import { classOfSpid } from '../../lib/nexon/meta.ts'
import type { ClassMeta } from '../../lib/nexon/types.ts'
import { searchPlayers, type PlayerGroup } from '../../lib/playerSearch.ts'
import PlayerImage from '../PlayerImage.tsx'

interface Props {
  title: string
  index: PlayerGroup[] | null
  classMap: Map<number, ClassMeta>
  classRank: Map<number, number>
  onPick: (spid: number) => void
  onClose: () => void
}

/** 선수 이름으로 찾고 → 카드(클래스)를 골라 spid를 돌려준다 */
export default function PlayerPicker({ title, index, classMap, classRank, onPick, onClose }: Props) {
  const [query, setQuery] = useState('')
  const deferred = useDeferredValue(query)
  const [player, setPlayer] = useState<PlayerGroup | null>(null)

  const results = index && deferred.trim() ? searchPlayers(index, deferred, { limit: 30 }) : []
  const rank = (s: number) => classRank.get(classOfSpid(s)) ?? Number.MAX_SAFE_INTEGER

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="row sheet-header">
          <strong className="grow">{player ? `${player.name} 카드 선택` : title}</strong>
          {player && (
            <button type="button" className="secondary" onClick={() => setPlayer(null)}>
              뒤로
            </button>
          )}
          <button type="button" className="secondary" onClick={onClose}>
            닫기
          </button>
        </div>

        {!player && (
          <>
            <input
              aria-label="선수 이름"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="선수 이름 (초성 가능)"
              autoFocus
              autoCapitalize="off"
              spellCheck={false}
            />
            {!index && <p className="muted">선수 목록을 불러오는 중…</p>}
            {index && deferred.trim() && results.length === 0 && <p className="muted">검색 결과가 없습니다.</p>}
            <ul className="picker-list">
              {results.map((g) => (
                <li key={g.pid}>
                  <button type="button" className="player-summary" onClick={() => setPlayer(g)}>
                    <PlayerImage spid={[...g.spids].sort((a, b) => rank(a) - rank(b))[0]} alt="" size={36} />
                    <span className="player-name">{g.name}</span>
                    <span className="muted small">카드 {g.spids.length}장</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {player && (
          <ul className="card-grid" aria-label={`${player.name} 카드 목록`}>
            {[...player.spids]
              .sort((a, b) => rank(a) - rank(b))
              .map((s) => {
                const meta = classMap.get(classOfSpid(s))
                const className = meta ? meta.className.replace(/\s*\(.*\)$/, '') : '알 수 없는 클래스'
                return (
                  <li key={s}>
                    <button type="button" className="player-card" aria-label={`${player.name} ${className}`} onClick={() => onPick(s)}>
                      <PlayerImage spid={s} alt="" size={56} />
                      {meta?.classImg ? (
                        <img className="class-badge" src={meta.classImg} alt="" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="class-badge text">{className}</span>
                      )}
                    </button>
                  </li>
                )
              })}
          </ul>
        )}
      </div>
    </div>
  )
}
