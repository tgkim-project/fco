import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import PlayerPicker from '../components/squad/PlayerPicker.tsx'
import Pitch from '../components/squad/Pitch.tsx'
import { useMeta } from '../hooks/useMeta.ts'
import { classReleaseRank, HIDDEN_CLASSES } from '../lib/classOrder.ts'
import { classOfSpid, toLookup } from '../lib/nexon/meta.ts'
import { buildPlayerIndex } from '../lib/playerSearch.ts'
import { FORMATIONS, getFormation } from '../lib/squad/formations.ts'
import { decodeSquad, encodeSquad } from '../lib/squad/shareCode.ts'
import { assignSlot, createSquad, loadSquads, saveSquads, swapSlots, type Squad } from '../lib/squad/squadStore.ts'

type SlotAction = { index: number; mode: 'menu' | 'pick' } | null

function initialSquads(): Squad[] {
  const saved = loadSquads()
  return saved.length ? saved : [createSquad('내 스쿼드 1')]
}

export default function SquadPage() {
  const [params, setParams] = useSearchParams()
  const shared = useMemo(() => {
    const code = params.get('s')
    return code ? decodeSquad(code) : null
  }, [params])
  const sharedInvalid = params.has('s') && !shared

  const [squads, setSquads] = useState<Squad[]>(initialSquads)
  const [currentId, setCurrentId] = useState(() => squads[0].id)
  const [slotAction, setSlotAction] = useState<SlotAction>(null)
  const [swapFrom, setSwapFrom] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const spid = useMeta('spid')
  const classes = useMeta('class')
  const names = useMemo(() => (spid.data ? toLookup(spid.data, (p) => p.id, (p) => p.name) : null), [spid.data])
  const index = useMemo(
    () => (spid.data ? buildPlayerIndex(spid.data.filter((p) => !HIDDEN_CLASSES.has(classOfSpid(p.id)))) : null),
    [spid.data],
  )
  const classMap = useMemo(() => new Map((classes.data ?? []).map((c) => [c.class, c])), [classes.data])
  const classRank = useMemo(() => classReleaseRank(classes.data ?? []), [classes.data])

  // 변경 사항은 바로 기기에 저장
  useEffect(() => {
    saveSquads(squads)
  }, [squads])

  const squad = squads.find((s) => s.id === currentId) ?? squads[0]
  const formation = getFormation(squad.formation)
  const filled = squad.slots.filter((s) => s != null).length

  function update(patch: Partial<Pick<Squad, 'name' | 'formation' | 'slots'>>) {
    setSquads((list) => list.map((s) => (s.id === squad.id ? { ...s, ...patch, updatedAt: Date.now() } : s)))
  }

  function addSquad(base?: { formation: string; slots: Array<number | null> }, name?: string) {
    const created = createSquad(name ?? `내 스쿼드 ${squads.length + 1}`, base?.formation, base?.slots)
    setSquads((list) => [...list, created])
    setCurrentId(created.id)
    setSwapFrom(null)
    return created
  }

  function deleteSquad() {
    const rest = squads.filter((s) => s.id !== squad.id)
    const next = rest.length ? rest : [createSquad('내 스쿼드 1')]
    setSquads(next)
    setCurrentId(next[0].id)
    setConfirmDelete(false)
  }

  function handleSlotClick(i: number) {
    setNotice(null)
    if (swapFrom != null) {
      if (swapFrom !== i) update({ slots: swapSlots(squad.slots, swapFrom, i) })
      setSwapFrom(null)
      return
    }
    setSlotAction({ index: i, mode: squad.slots[i] == null ? 'pick' : 'menu' })
  }

  function handlePick(pickedSpid: number) {
    if (!slotAction) return
    update({ slots: assignSlot(squad.slots, slotAction.index, pickedSpid) })
    setSlotAction(null)
  }

  async function copyShareLink() {
    const code = encodeSquad(squad.formation, squad.slots)
    const url = `${window.location.origin}${window.location.pathname}#/squad?s=${code}`
    try {
      await navigator.clipboard.writeText(url)
      setNotice('공유 링크를 복사했습니다.')
    } catch {
      window.prompt('아래 링크를 복사하세요', url)
    }
  }

  function clearShared() {
    const next = new URLSearchParams(params)
    next.delete('s')
    setParams(next, { replace: true })
  }

  function saveShared() {
    if (!shared) return
    addSquad(shared, '공유받은 스쿼드')
    clearShared()
    setNotice('공유받은 스쿼드를 저장했습니다.')
  }

  // 공유 링크로 들어온 경우: 미리보기 화면
  if (shared) {
    const sharedFormation = getFormation(shared.formation)
    return (
      <section className="page">
        <h1>공유받은 스쿼드</h1>
        <p className="muted">{sharedFormation.name}</p>
        <Pitch
          formation={sharedFormation}
          slots={shared.slots}
          names={names}
          classMap={classMap}
          selectedIndex={null}
          onSlotClick={() => {}}
        />
        <div className="row">
          <button type="button" onClick={saveShared}>
            내 스쿼드로 저장
          </button>
          <button type="button" className="secondary" onClick={clearShared}>
            닫기
          </button>
        </div>
      </section>
    )
  }

  const actionSpid = slotAction ? squad.slots[slotAction.index] : null

  return (
    <section className="page">
      <h1>스쿼드 메이커</h1>
      {sharedInvalid && (
        <p className="feedback error" role="alert">
          공유 링크가 올바르지 않습니다.
        </p>
      )}

      <div className="panel">
        <div className="row">
          <select
            aria-label="스쿼드 선택"
            className="grow"
            value={squad.id}
            onChange={(e) => {
              setCurrentId(e.target.value)
              setSwapFrom(null)
              setConfirmDelete(false)
            }}
          >
            {squads.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button type="button" className="secondary" onClick={() => addSquad()}>
            새 스쿼드
          </button>
        </div>
        <div className="row">
          <input
            aria-label="스쿼드 이름"
            className="grow"
            value={squad.name}
            maxLength={30}
            onChange={(e) => update({ name: e.target.value })}
          />
          <select aria-label="포메이션" value={squad.formation} onChange={(e) => update({ formation: e.target.value })}>
            {FORMATIONS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="muted small" role="status">
        {swapFrom != null
          ? `${formation.slots[swapFrom].label} 선수와 바꿀 자리를 누르세요.`
          : `11명 중 ${filled}명 · 자리를 눌러 선수를 넣으세요.`}
      </p>

      <Pitch
        formation={formation}
        slots={squad.slots}
        names={names}
        classMap={classMap}
        selectedIndex={swapFrom}
        onSlotClick={handleSlotClick}
      />

      <div className="row">
        <button type="button" onClick={copyShareLink} disabled={filled === 0}>
          공유 링크 복사
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => update({ slots: Array.from({ length: 11 }, () => null) })}
          disabled={filled === 0}
        >
          모두 비우기
        </button>
        {confirmDelete ? (
          <>
            <button type="button" className="danger" onClick={deleteSquad}>
              삭제 확인
            </button>
            <button type="button" className="secondary" onClick={() => setConfirmDelete(false)}>
              취소
            </button>
          </>
        ) : (
          <button type="button" className="secondary" onClick={() => setConfirmDelete(true)}>
            스쿼드 삭제
          </button>
        )}
      </div>
      {notice && (
        <p className="feedback success" role="status">
          {notice}
        </p>
      )}
      <p className="muted small">스쿼드는 이 기기에만 저장됩니다. API 키 없이 쓸 수 있습니다.</p>

      {slotAction?.mode === 'menu' && actionSpid != null && (
        <div className="sheet-backdrop" onClick={() => setSlotAction(null)}>
          <div
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={`${formation.slots[slotAction.index].label} 자리`}
            onClick={(e) => e.stopPropagation()}
          >
            <strong>
              {formation.slots[slotAction.index].label} · {names?.get(actionSpid) ?? '선수'}
            </strong>
            <button type="button" onClick={() => setSlotAction({ index: slotAction.index, mode: 'pick' })}>
              선수 변경
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setSwapFrom(slotAction.index)
                setSlotAction(null)
              }}
            >
              자리 바꾸기
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                update({ slots: assignSlot(squad.slots, slotAction.index, null) })
                setSlotAction(null)
              }}
            >
              빼기
            </button>
            <button type="button" className="secondary" onClick={() => setSlotAction(null)}>
              닫기
            </button>
          </div>
        </div>
      )}

      {slotAction?.mode === 'pick' && (
        <PlayerPicker
          title={`${formation.slots[slotAction.index].label} 선수 선택`}
          index={index}
          classMap={classMap}
          classRank={classRank}
          onPick={handlePick}
          onClose={() => setSlotAction(null)}
        />
      )}
    </section>
  )
}
