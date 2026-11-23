// 개발 단계 키 한도(초당 5건)를 넘지 않도록 호출 간격을 조절한다.
// 하루 한도(1,000건)는 서버가 429로 알려주므로 여기서는 초당 한도만 지킨다.

export interface RateLimiterOptions {
  maxPerWindow: number
  windowMs: number
  now?: () => number
  sleep?: (ms: number) => Promise<void>
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export function createRateLimiter({ maxPerWindow, windowMs, now = Date.now, sleep = defaultSleep }: RateLimiterOptions) {
  const recent: number[] = []
  let chain: Promise<void> = Promise.resolve()

  async function acquire(): Promise<void> {
    for (;;) {
      const t = now()
      while (recent.length && t - recent[0] >= windowMs) recent.shift()
      if (recent.length < maxPerWindow) {
        recent.push(t)
        return
      }
      await sleep(windowMs - (t - recent[0]))
    }
  }

  /** 순서대로 슬롯을 얻은 뒤 fn을 실행한다 */
  return function schedule<T>(fn: () => Promise<T>): Promise<T> {
    const slot = chain.then(acquire)
    chain = slot.catch(() => undefined)
    return slot.then(fn)
  }
}
