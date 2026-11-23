import type { ClassMeta } from '../../lib/nexon/types.ts'
import { classOfSpid } from '../../lib/nexon/meta.ts'
import type { Formation } from '../../lib/squad/formations.ts'
import PlayerImage from '../PlayerImage.tsx'

interface Props {
  formation: Formation
  slots: Array<number | null>
  names: Map<number, string> | null
  classMap: Map<number, ClassMeta>
  /** 자리 바꾸기 중 선택된 자리 */
  selectedIndex: number | null
  onSlotClick: (index: number) => void
}

export default function Pitch({ formation, slots, names, classMap, selectedIndex, onSlotClick }: Props) {
  return (
    <div className="pitch" role="group" aria-label={`${formation.name} 포메이션`}>
      <div className="pitch-lines" aria-hidden="true" />
      {formation.slots.map((slot, i) => {
        const spid = slots[i] ?? null
        const name = spid != null ? (names?.get(spid) ?? '…') : null
        const cls = spid != null ? classMap.get(classOfSpid(spid)) : undefined
        const label = spid != null ? `${slot.label} ${name}` : `${slot.label} 비어 있음`
        return (
          <button
            key={i}
            type="button"
            className={`slot ${spid == null ? 'empty' : ''} ${selectedIndex === i ? 'selected' : ''}`}
            style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
            aria-label={label}
            aria-pressed={selectedIndex === i}
            onClick={() => onSlotClick(i)}
          >
            {spid != null ? (
              <>
                <PlayerImage spid={spid} alt="" size={40} />
                <span className="slot-name">
                  {cls?.classImg ? (
                    <img className="class-badge" src={cls.classImg} alt="" referrerPolicy="no-referrer" />
                  ) : null}
                  {name}
                </span>
              </>
            ) : (
              <span className="slot-plus" aria-hidden="true">
                +
              </span>
            )}
            <span className="slot-label">{slot.label}</span>
          </button>
        )
      })}
    </div>
  )
}
