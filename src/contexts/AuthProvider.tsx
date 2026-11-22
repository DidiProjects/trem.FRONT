import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authApi, type Me } from '@/services/authApi'
import { AuthContext, type AuthContextValue, type AuthStatus } from './authContext'
import { ApiError } from '@/services/http'
import { refresh, session } from '@/services/session'

interface SessionState {
  status: AuthStatus
  user: Me | null
}

/** The session behind this tab's refresh token, if any. */
async function readSession(): Promise<SessionState> {
  try {
    if (!(await refresh())) return { status: 'anonymous', user: null }
    return { status: 'authenticated', user: await authApi.me() }
  } catch (error) {
    const status = error instanceof ApiError && error.status === 401 ? 'anonymous' : 'unavailable'
    return { status, user: null }
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(() => (session.hasStoredSession() ? 'loading' : 'anonymous'))
  const [user, setUser] = useState<Me | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const apply = useCallback((state: SessionState) => {
    setUser(state.user)
    setStatus(state.status)
  }, [])

  const loadUser = useCallback(async () => apply({ status: 'authenticated', user: await authApi.me() }), [apply])

  const restore = useCallback(async () => apply(await readSession()), [apply])

  useEffect(() => {
    if (!session.hasStoredSession()) return
    let active = true
    // `refresh` is single-flight, so StrictMode's double effect sends one request.
    void readSession().then((state) => {
      if (active) apply(state)
    })
    return () => {
      active = false
    }
  }, [apply])

  useEffect(
    () =>
      session.subscribe((event) => {
        if (event === 'logged-in-elsewhere') {
          void restore()
          return
        }
        setUser(null)
        setStatus('anonymous')
        setNotice(event === 'ended' ? 'Sua sessão expirou. Entre de novo.' : null)
      }),
    [restore],
  )

  const logout = useCallback(async () => {
    try {
      await session.logout()
    } finally {
      setUser(null)
      setNotice(null)
      setStatus('anonymous')
    }
  }, [])

  const retry = useCallback(() => {
    setStatus('loading')
    void restore()
  }, [restore])
  const clearNotice = useCallback(() => setNotice(null), [])
  const reloadUser = useCallback(() => loadUser().catch(() => undefined), [loadUser])
  const acceptToken = useCallback(
    async (accessToken: string) => {
      session.start(accessToken)
      setNotice(null)
      await loadUser()
    },
    [loadUser],
  )

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, notice, logout, retry, clearNotice, reloadUser, acceptToken }),
    [status, user, notice, logout, retry, clearNotice, reloadUser, acceptToken],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
