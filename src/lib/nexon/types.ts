// FC온라인 Open API 응답 타입
// 출처: openapi.nexon.com/static/api/fconline/{2,3,5,6}_*.yaml (2026-11-23 확인)

export interface OuidResponse {
  ouid: string
}

export interface UserBasic {
  ouid: string
  nickname: string
  level: number
}

export interface MaxDivision {
  matchType: number
  division: number
  /** 최고 등급 달성 일자 (UTC0) */
  achievementDate: string
}

export type MatchResult = '승' | '무' | '패'

export interface MatchSummaryDetail {
  seasonId: number
  matchResult: MatchResult
  /** 0 정상종료, 1 몰수승, 2 몰수패 */
  matchEndType: number
  systemPause: number
  foul: number
  injury: number
  redCards: number
  yellowCards: number
  dribble: number
  cornerKick: number
  possession: number
  OffsideCount: number
  averageRating: number
  controller: string
}

export interface MatchShoot {
  shootTotal: number
  effectiveShootTotal: number
  shootOutScore: number
  goalTotal: number
  /** 게임 종료 후 유저에게 노출되는 골 수 */
  goalTotalDisplay: number
  ownGoal: number
  shootHeading: number
  goalHeading: number
  shootFreekick: number
  goalFreekick: number
  shootInPenalty: number
  goalInPenalty: number
  shootOutPenalty: number
  goalOutPenalty: number
  shootPenaltyKick: number
  goalPenaltyKick: number
}

export interface MatchShootDetail {
  goalTime: number
  x: number
  y: number
  type: number
  /** 1 유효슛, 2 빗나감, 3 골 */
  result: number
  spId: number
  spGrade: number
  spLevel: number
  spIdType: boolean
  assist: boolean
  assistSpId: number
  assistX: number
  assistY: number
  hitPost: boolean
  inPenalty: boolean
}

export interface MatchPass {
  passTry: number
  passSuccess: number
  shortPassTry: number
  shortPassSuccess: number
  longPassTry: number
  longPassSuccess: number
  bouncingLobPassTry: number
  bouncingLobPassSuccess: number
  drivenGroundPassTry: number
  drivenGroundPassSuccess: number
  throughPassTry: number
  throughPassSuccess: number
  lobbedThroughPassTry: number
  lobbedThroughPassSuccess: number
}

export interface MatchDefence {
  blockTry: number
  blockSuccess: number
  tackleTry: number
  tackleSuccess: number
}

export interface MatchPlayerStatus {
  shoot: number
  effectiveShoot: number
  assist: number
  goal: number
  dribble: number
  intercept: number
  defending: number
  passTry: number
  passSuccess: number
  dribbleTry: number
  dribbleSuccess: number
  ballPossesionTry: number
  ballPossesionSuc: number
  aerialTry: number
  aerialSuccess: number
  blockTry: number
  block: number
  tackleTry: number
  tackle: number
  yellowCards: number
  redCards: number
  spRating: number
}

export interface MatchPlayer {
  spId: number
  spPosition: number
  spGrade: number
  status: MatchPlayerStatus
}

export interface MatchInfo {
  ouid: string
  nickname: string
  division?: number
  matchDetail: MatchSummaryDetail
  shoot: MatchShoot
  shootDetail: MatchShootDetail[]
  pass: MatchPass
  defence: MatchDefence
  player: MatchPlayer[]
}

export interface MatchDetail {
  matchId: string
  /** 매치 일자 (UTC0) */
  matchDate: string
  matchType: number
  /** 상대가 통계 생성 전에 나가면 한 명만 들어 있을 수 있다 */
  matchInfo: MatchInfo[]
}

// ---- 메타데이터 (키 불필요) ----

export interface MatchTypeMeta {
  matchtype: number
  desc: string
}

export interface DivisionMeta {
  divisionId: number
  divisionName: string
}

/** 공식경기 최신 시즌 (랭크 시즌). 선수 카드 시즌이 아님 */
export interface SeasonMeta {
  matchtype: number
  seasonid: string
}

/** 선수 카드 클래스(예전 seasonId). spid 앞 3자리 */
export interface ClassMeta {
  class: number
  className: string
  classImg: string
}

export interface SpPositionMeta {
  spposition: number
  desc: string
}

export interface SpidMeta {
  id: number
  name: string
}
