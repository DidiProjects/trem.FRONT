import { useCallback, useEffect, useState } from 'react'
import { authApi } from '@/services/authApi'

export type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'unknown'

// Long enough to skip the names a person is still typing, short enough to answer
// before they reach the e-mail field.
export const USERNAME_CHECK_DELAY_MS = 400

/**
 * Whether `username` is free, asked to trem.API once the typing pauses. Only a name that
 * already passes the local rules is asked; answers are kept per name, so going back to
 * one does not ask again, and a late answer never lands on a newer name. A failed check
 * (rate limit, network) is "unknown": the form lets it through and the sign-up's 409 decides.
 */
export function useUsernameCheck(username: string, valid: boolean) {
  const name = username.trim()
  const [answers, setAnswers] = useState<Record<string, UsernameStatus>>({})

  useEffect(() => {
    if (!valid || answers[name]) return
    let live = true
    const timer = setTimeout(() => {
      authApi
        .usernameAvailable(name)
        .then(({ available }) => (available ? 'available' : 'taken') as UsernameStatus)
        .catch(() => 'unknown' as UsernameStatus)
        .then((status) => {
          if (live) setAnswers((prev) => ({ ...prev, [name]: status }))
        })
    }, USERNAME_CHECK_DELAY_MS)
    return () => {
      live = false
      clearTimeout(timer)
    }
  }, [name, valid, answers])

  const markTaken = useCallback((taken: string) => setAnswers((prev) => ({ ...prev, [taken.trim()]: 'taken' })), [])

  const status: UsernameStatus = !valid ? 'idle' : (answers[name] ?? 'checking')
  return { status, markTaken }
}
