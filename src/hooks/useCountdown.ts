import { useEffect, useState } from 'react'

/** Seconds left from `seconds`; restart it by passing a new value (e.g. a 429 Retry-After). */
export function useCountdown(): [number, (seconds: number) => void] {
  const [left, setLeft] = useState(0)

  useEffect(() => {
    if (left <= 0) return
    const id = setTimeout(() => setLeft((s) => s - 1), 1000)
    return () => clearTimeout(id)
  }, [left])

  return [left, setLeft]
}
