import { useEffect, useMemo, useState } from 'react'
import KeyRequiredNotice from '../components/KeyRequiredNotice.tsx'
import PlayerImage from '../components/PlayerImage.tsx'
import { useApiKey } from '../hooks/useApiKey.ts'
import { useMeta } from '../hooks/useMeta.ts'
import { formatBp, formatMatchDate } from '../lib/matchFormat.ts'
import { NexonApiError } from '../lib/nexon/errors.ts'
import { getTrades } from '../lib/nexon/fconline.ts'
import { classOfSpid, toLookup } from '../lib/nexon/meta.ts'
import type { TradeItem, TradeType } from '../lib/nexon/types.ts'

const PAGE_SIZE = 20
const TABS: Array<{ type: TradeType; label: string }> = [
  { type: 'buy', label: '구매' },
  { type: 'sell', label: '판매' },
]

export default function TradePage() {
  const apiKey = useApiKey()
  const [tab, setTab] = useState<TradeType>('buy')

  return (
    <section className="page">
      <h1>내 거래 기록</h1>
      {!apiKey ? (
        <KeyRequiredNotice />
      ) : (
        <>
          <p className="muted small">
            이적시장 거래 기록은 API 키를 발급한 넥슨 계정 본인의 것만 조회됩니다. 다른 유저의 거래는 볼 수 없습니다.
          </p>
          <div className="row" role="tablist" aria-label="거래 종류">
            {TABS.map((t) => (
              <button
                key={t.type}
                type="button"
                role="tab"
                aria-selected={tab === t.type}
                className={tab === t.type ? '' : 'secondary'}
                onClick={() => setTab(t.type)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <TradeList key={tab} apiKey={apiKey} type={tab} />
          <p className="muted small">Data based on NEXON Open API</p>
        </>
      )}
    </section>
  )
}

/** 거래 종류 하나의 목록. 탭이 바뀌면 key로 새로 만든다 */
function TradeList({ apiKey, type }: { apiKey: string; type: TradeType }) {
  const [items, setItems] = useState<TradeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)

  const spid = useMeta('spid')
  const classes = useMeta('class')
  const names = useMemo(() => (spid.data ? toLookup(spid.data, (p) => p.id, (p) => p.name) : null), [spid.data])
  const classMap = useMemo(() => new Map((classes.data ?? []).map((c) => [c.class, c])), [classes.data])

  const toMessage = (e: unknown) => (e instanceof NexonApiError ? e.userMessage : '거래 기록을 불러오지 못했습니다.')

  useEffect(() => {
    let alive = true
    getTrades({ apiKey }, type, { offset: 0, limit: PAGE_SIZE })
      .then(
        (page) => {
          if (!alive) return
          setItems(page)
          setHasMore(page.length === PAGE_SIZE)
        },
        (e: unknown) => alive && setError(toMessage(e)),
      )
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [apiKey, type])

  async function handleMore() {
    setLoading(true)
    setError(null)
    try {
      const page = await getTrades({ apiKey }, type, { offset: items.length, limit: PAGE_SIZE })
      setItems((prev) => [...prev, ...page])
      setHasMore(page.length === PAGE_SIZE)
    } catch (e) {
      setError(toMessage(e))
    } finally {
      setLoading(false)
    }
  }

  const total = items.reduce((sum, t) => sum + t.value, 0)
  const label = type === 'buy' ? '구매' : '판매'

  return (
    <>
      {items.length > 0 && (
        <p className="muted">
          불러온 {items.length}건 {label} 합계 <strong>{formatBp(total)}</strong>
        </p>
      )}
      <ul className="player-list" aria-label={`${label} 기록`}>
        {items.map((t) => {
          const cls = classMap.get(classOfSpid(t.spid))
          const name = names?.get(t.spid) ?? (spid.loading ? '…' : '알 수 없는 선수')
          return (
            <li key={t.saleSn} className="player-row">
              <div className="player-summary">
                <PlayerImage spid={t.spid} alt="" size={40} />
                <span className="player-name">
                  {cls?.classImg ? (
                    <img className="class-badge" src={cls.classImg} alt={cls.className} referrerPolicy="no-referrer" />
                  ) : null}{' '}
                  {name} <span className="muted small">+{t.grade}</span>
                </span>
                <span className="trade-value">
                  <strong>{formatBp(t.value)}</strong>
                  <span className="muted small">{formatMatchDate(t.tradeDate)}</span>
                </span>
              </div>
            </li>
          )
        })}
      </ul>
      {!loading && !error && items.length === 0 && <p className="muted">{label} 기록이 없습니다.</p>}
      {loading && <p className="muted">거래 기록을 불러오는 중…</p>}
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
