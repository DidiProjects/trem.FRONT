import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '@/services/http'

export type Load<T> =
  | { state: 'loading' }
  | { state: 'error'; error: ApiError }
  | { state: 'ready'; data: T }

function asApiError(error: unknown): ApiError {
  return error instanceof ApiError ? error : new ApiError('Algo deu errado. Tente de novo.', 0)
}

/**
 * Runs `loader` on mount and on `reload()`. State is only set from the promise, never
 * synchronously in the effect (React Compiler rule), and a stale answer is dropped.
 */
export function useLoad<T>(loader: () => Promise<T>) {
  const [result, setResult] = useState<Load<T>>({ state: 'loading' })
  const [round, setRound] = useState(0)

  useEffect(() => {
    let active = true
    loader().then(
      (data) => active && setResult({ state: 'ready', data }),
      (error: unknown) => active && setResult({ state: 'error', error: asApiError(error) }),
    )
    return () => {
      active = false
    }
    // The loader is a module-level API call; reload() is the way to run it again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round])

  const reload = useCallback(() => setRound((r) => r + 1), [])
  /** Replaces the data in place, e.g. after a save, without a round trip. */
  const set = useCallback((data: T) => setResult({ state: 'ready', data }), [])

  return { result, reload, set }
}
