import { createContext } from 'react'
import type { Me, SecondFactor } from '@/services/authApi'

export type AuthStatus =
  | 'loading' // restoring the session from the cookie
  | 'anonymous'
  | 'must-change-password' // logged in with a provisional or expired password
  | 'authenticated'
  | 'unavailable' // the API could not be reached while restoring

/** What a login step produced: the session, or a request for the second factor. */
export type LoginResult = { kind: 'done' } | { kind: 'mfa'; mfaToken: string }

export interface PendingMfa {
  mfaToken: string
  message: string
}

export interface AuthContextValue {
  status: AuthStatus
  user: Me | null
  /** Why the last session ended without the user asking, to show on the login page. */
  notice: string | null
  /** A second-factor step the login page must resume (after a password change). */
  pendingMfa: PendingMfa | null
  login: (username: string, password: string) => Promise<LoginResult>
  verifyMfa: (mfaToken: string, factor: SecondFactor) => Promise<LoginResult>
  changePassword: (current: string, next: string) => Promise<void>
  logout: () => Promise<void>
  retry: () => void
  clearNotice: () => void
  clearPendingMfa: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
