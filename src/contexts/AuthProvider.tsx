import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authApi, type Me, type SecondFactor, type TokenResponse } from '@/services/authApi'
import { AuthContext, type AuthContextValue, type AuthStatus, type LoginResult, type PendingMfa } from './authContext'
import { ApiError } from '@/services/http'
import { refresh, session } from '@/services/session'

interface SessionState {
  status: AuthStatus
  user: Me | null
}

function stateOf(me: Me): SessionState {
  return { status: me.must_change_password ? 'must-change-password' : 'authenticated', user: me }
}

/** The session behind the cookie, if any. */
async function readSession(): Promise<SessionState> {
  try {
    if (!(await refresh())) return { status: 'anonymous', user: null }
    return stateOf(await authApi.me())
  } catch (error) {
    const status = error instanceof ApiError && error.status === 401 ? 'anonymous' : 'unavailable'
    return { status, user: null }
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(() => (session.hasStoredSession() ? 'loading' : 'anonymous'))
  const [user, setUser] = useState<Me | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pendingMfa, setPendingMfa] = useState<PendingMfa | null>(null)

  const apply = useCallback((state: SessionState) => {
    setUser(state.user)
    setStatus(state.status)
  }, [])

  const loadUser = useCallback(async () => apply(stateOf(await authApi.me())), [apply])

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

  const finish = useCallback(
    async (tokens: TokenResponse): Promise<LoginResult> => {
      if (tokens.mfa_required && tokens.mfa_token) return { kind: 'mfa', mfaToken: tokens.mfa_token }
      if (!tokens.access_token) throw new ApiError('Resposta inesperada do servidor', 500)
      session.start(tokens.access_token)
      setNotice(null)
      await loadUser()
      return { kind: 'done' }
    },
    [loadUser],
  )

  const login = useCallback(
    async (username: string, password: string) => finish(await authApi.login(username, password)),
    [finish],
  )

  const verifyMfa = useCallback(
    async (mfaToken: string, factor: SecondFactor) => finish(await authApi.verifyMfa(mfaToken, factor)),
    [finish],
  )

  const changePassword = useCallback(
    async (current: string, next: string) => {
      const username = user?.username ?? ''
      await authApi.changePassword(current, next)
      // The API ends every session of the account on a password change: log in again
      // with the new password. With TOTP on, the login page picks up at the code step.
      session.forget()
      try {
        const result = await login(username, next)
        if (result.kind === 'mfa') {
          setPendingMfa({ mfaToken: result.mfaToken, message: 'Senha alterada. Confirme com o código do autenticador.' })
          setUser(null)
          setStatus('anonymous')
        }
      } catch {
        setUser(null)
        setStatus('anonymous')
        setNotice('Senha alterada. Entre com a nova senha.')
      }
    },
    [user, login],
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
  const clearPendingMfa = useCallback(() => setPendingMfa(null), [])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      notice,
      pendingMfa,
      login,
      verifyMfa,
      changePassword,
      logout,
      retry,
      clearNotice,
      clearPendingMfa,
    }),
    [status, user, notice, pendingMfa, login, verifyMfa, changePassword, logout, retry, clearNotice, clearPendingMfa],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
