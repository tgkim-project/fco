import { formatMatchDate } from '../../lib/matchFormat.ts'
import { splitMatchSides } from '../../lib/nexon/fconline.ts'
import { NexonApiError } from '../../lib/nexon/errors.ts'
import type { MatchDetail } from '../../lib/nexon/types.ts'
import MatchDetailView from './MatchDetailView.tsx'

export interface MatchItem {
  matchId: string
  detail?: MatchDetail
  error?: unknown
}

interface Props {
  ouid: string
  items: MatchItem[]
  expandedId: string | null
  onToggle: (matchId: string) => void
}

const RESULT_CLASS: Record<string, string> = { 승: 'win', 무: 'draw', 패: 'lose' }

export default function MatchList({ ouid, items, expandedId, onToggle }: Props) {
  return (
    <ul className="match-list">
      {items.map((item) => {
        if (!item.detail) {
          const message = item.error instanceof NexonApiError ? item.error.userMessage : '불러오지 못했습니다.'
          return (
            <li key={item.matchId} className="match-row error">
              경기 정보를 불러오지 못했습니다. <span className="muted small">{message}</span>
            </li>
          )
        }
        const { me, opponent } = splitMatchSides(item.detail, ouid)
        const result = me?.matchDetail.matchResult
        const expanded = expandedId === item.matchId
        return (
          <li key={item.matchId} className={`match-row ${result ? RESULT_CLASS[result] : ''}`}>
            <button
              type="button"
              className="match-summary"
              aria-expanded={expanded}
              onClick={() => onToggle(item.matchId)}
            >
              <span className="result">{result ?? '-'}</span>
              <span className="score">
                {me?.shoot.goalTotalDisplay ?? '-'} : {opponent?.shoot.goalTotalDisplay ?? '-'}
              </span>
              <span className="opponent">vs {opponent?.nickname ?? '알 수 없음'}</span>
              <span className="muted small">{formatMatchDate(item.detail.matchDate)}</span>
            </button>
            {expanded && <MatchDetailView detail={item.detail} ouid={ouid} />}
          </li>
        )
      })}
    </ul>
  )
}
