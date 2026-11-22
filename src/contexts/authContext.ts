import { createContext } from 'react'
import type { Me } from '@/services/authApi'

export type AuthStatus =
  | 'loading' // restoring the session with this tab's refresh token
  | 'anonymous'
  | 'authenticated'
  | 'unavailable' // the API could not be reached while restoring

export interface AuthContextValue {
  status: AuthStatus
  user: Me | null
  /** Why the last session ended without the user asking, to show on the login page. */
  notice: string | null
  logout: () => Promise<void>
  retry: () => void
  clearNotice: () => void
  /** Reads /me again, after a change to the account. */
  reloadUser: () => Promise<void>
  /** A login finished at authentik (the callback): start the session with its token. */
  acceptToken: (accessToken: string) => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
