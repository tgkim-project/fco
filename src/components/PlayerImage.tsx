import { useState } from 'react'
import { playerImageUrls } from '../lib/nexon/images.ts'

interface Props {
  spid: number
  alt: string
  size?: number
}

/** 선수 이미지. spid 이미지가 없으면 pid 이미지, 그것도 없으면 빈 자리 표시 */
export default function PlayerImage({ spid, alt, size = 48 }: Props) {
  const urls = playerImageUrls(spid)
  const [index, setIndex] = useState(0)

  if (index >= urls.length) {
    return (
      <span className="player-img placeholder" style={{ width: size, height: size }} role="img" aria-label={alt}>
        ?
      </span>
    )
  }
  return (
    <img
      className="player-img"
      src={urls[index]}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setIndex((i) => i + 1)}
    />
  )
}
