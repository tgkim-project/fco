// 포메이션 프리셋. 좌표는 경기장 기준 %(x: 왼→오, y: 위=상대 골대 → 아래=우리 골대)
// 자리 순서는 GK부터 수비 → 미드 → 공격. 포메이션을 바꿔도 같은 순번의 선수는 그대로 옮겨간다.

export interface FormationSlot {
  label: string
  x: number
  y: number
}

export interface Formation {
  id: string
  name: string
  slots: FormationSlot[]
}

const GK: FormationSlot = { label: 'GK', x: 50, y: 92 }

function row(y: number, labels: string[], spread = 80): FormationSlot[] {
  const n = labels.length
  const start = 50 - spread / 2
  return labels.map((label, i) => ({ label, y, x: n === 1 ? 50 : start + (spread * i) / (n - 1) }))
}

export const FORMATIONS: Formation[] = [
  {
    id: '4-2-3-1',
    name: '4-2-3-1',
    slots: [GK, ...row(74, ['LB', 'LCB', 'RCB', 'RB']), ...row(56, ['LDM', 'RDM'], 36), ...row(36, ['LAM', 'CAM', 'RAM'], 64), ...row(14, ['ST'])],
  },
  {
    id: '4-3-3',
    name: '4-3-3',
    slots: [GK, ...row(74, ['LB', 'LCB', 'RCB', 'RB']), ...row(50, ['LCM', 'CM', 'RCM'], 56), ...row(20, ['LW', 'ST', 'RW'], 70)],
  },
  {
    id: '4-4-2',
    name: '4-4-2',
    slots: [GK, ...row(74, ['LB', 'LCB', 'RCB', 'RB']), ...row(46, ['LM', 'LCM', 'RCM', 'RM']), ...row(18, ['LS', 'RS'], 30)],
  },
  {
    id: '4-1-2-1-2',
    name: '4-1-2-1-2 (다이아몬드)',
    slots: [
      GK,
      ...row(74, ['LB', 'LCB', 'RCB', 'RB']),
      ...row(60, ['CDM']),
      ...row(46, ['LCM', 'RCM'], 50),
      ...row(32, ['CAM']),
      ...row(15, ['LS', 'RS'], 30),
    ],
  },
  {
    id: '4-2-2-2',
    name: '4-2-2-2',
    slots: [GK, ...row(74, ['LB', 'LCB', 'RCB', 'RB']), ...row(56, ['LDM', 'RDM'], 36), ...row(34, ['LAM', 'RAM'], 60), ...row(14, ['LS', 'RS'], 30)],
  },
  {
    id: '3-5-2',
    name: '3-5-2',
    slots: [GK, ...row(74, ['LCB', 'CB', 'RCB'], 56), ...row(48, ['LM', 'LCM', 'CM', 'RCM', 'RM'], 86), ...row(18, ['LS', 'RS'], 30)],
  },
  {
    id: '3-4-3',
    name: '3-4-3',
    slots: [GK, ...row(74, ['LCB', 'CB', 'RCB'], 56), ...row(48, ['LM', 'LCM', 'RCM', 'RM']), ...row(20, ['LW', 'ST', 'RW'], 70)],
  },
  {
    id: '5-3-2',
    name: '5-3-2',
    slots: [GK, ...row(72, ['LWB', 'LCB', 'CB', 'RCB', 'RWB'], 86), ...row(46, ['LCM', 'CM', 'RCM'], 56), ...row(18, ['LS', 'RS'], 30)],
  },
]

export const DEFAULT_FORMATION_ID = '4-2-3-1'

export function getFormation(id: string): Formation {
  return FORMATIONS.find((f) => f.id === id) ?? FORMATIONS[0]
}
