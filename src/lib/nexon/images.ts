import { pidOfSpid } from './meta.ts'

// 출처: openapi.nexon.com/static/api/fconline/6_script*.yaml, 서버 https://fco.dn.nexoncdn.co.kr
// spid 이미지가 없는 카드가 있어(403) pid 이미지로 대체한다.
const IMAGE_BASE = 'https://fco.dn.nexoncdn.co.kr/live/externalAssets/common'

/** 선수 얼굴 이미지 후보 URL (앞에서부터 시도) */
export function playerImageUrls(spid: number): string[] {
  return [`${IMAGE_BASE}/players/p${spid}.png`, `${IMAGE_BASE}/players/p${pidOfSpid(spid)}.png`]
}

/** 선수 액션샷 이미지 후보 URL (앞에서부터 시도) */
export function playerActionImageUrls(spid: number): string[] {
  return [`${IMAGE_BASE}/playersAction/p${spid}.png`, `${IMAGE_BASE}/playersAction/p${pidOfSpid(spid)}.png`]
}
