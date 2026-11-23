import { useEffect, useState } from 'react'
import { loadMeta, type MetaName, type MetaTypes } from '../lib/nexon/meta.ts'

export interface MetaState<T> {
  data: T | null
  error: unknown
  loading: boolean
}

/** 메타데이터 하나를 불러온다. enabled가 false면 불러오지 않는다(spid처럼 큰 데이터를 필요할 때만 받기 위해). */
export function useMeta<N extends MetaName>(name: N, enabled = true): MetaState<MetaTypes[N]> {
  const [result, setResult] = useState<{ name: N; data: MetaTypes[N] | null; error: unknown } | null>(null)

  useEffect(() => {
    if (!enabled) return
    let alive = true
    loadMeta(name).then(
      (data) => alive && setResult({ name, data, error: null }),
      (error: unknown) => alive && setResult({ name, data: null, error }),
    )
    return () => {
      alive = false
    }
  }, [name, enabled])

  const current = result?.name === name ? result : null
  return { data: current?.data ?? null, error: current?.error ?? null, loading: enabled && !current }
}
