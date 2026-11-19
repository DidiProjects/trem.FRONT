import { request } from './http'
import { authRequest } from './session'

export interface TokenResponse {
  access_token?: string
  expires_in?: number
  must_change_password?: boolean
  mfa_required?: boolean
  mfa_token?: string
}

export interface Me {
  id: string
  username: string
  email: string | null
  status: string
  permissions: string[]
  must_change_password: boolean
  totp_enabled: boolean
  recovery_codes_left: number
}

interface Message {
  message: string
}

export type SecondFactor = { code: string } | { recovery_code: string }

// "trem" is the account's own application: every active user may log in to it.
const AUDIENCE = 'trem'

export const authApi = {
  login: (username: string, password: string) =>
    request<TokenResponse>('/auth/login', {
      method: 'POST',
      body: { username, password, audience: AUDIENCE, session: 'cookie' },
    }),

  verifyMfa: (mfaToken: string, factor: SecondFactor) =>
    request<TokenResponse>('/auth/mfa/verify', {
      method: 'POST',
      body: { mfa_token: mfaToken, ...factor, session: 'cookie' },
    }),

  me: () => authRequest<Me>('/me'),

  changePassword: (currentPassword: string, newPassword: string) =>
    authRequest<Message>('/auth/change-password', {
      method: 'POST',
      body: { current_password: currentPassword, new_password: newPassword },
    }),

  usernameAvailable: (username: string) =>
    request<{ available: boolean }>(`/auth/username-available?username=${encodeURIComponent(username)}`),

  register: (username: string, email: string, password: string) =>
    request<Message>('/auth/register', { method: 'POST', body: { username, email, password } }),

  resendVerification: (email: string) =>
    request<Message>('/auth/resend-verification', { method: 'POST', body: { email } }),

  verifyEmail: (token: string) => request<Message>('/auth/verify-email', { method: 'POST', body: { token } }),

  forgotPassword: (email: string) =>
    request<Message>('/auth/forgot-password', { method: 'POST', body: { email } }),

  resetPassword: (token: string, newPassword: string) =>
    request<Message>('/auth/reset-password', { method: 'POST', body: { token, new_password: newPassword } }),
}
