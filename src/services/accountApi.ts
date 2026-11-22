import { form } from './filesApi'
import { authRequest } from './session'

export interface OwnKey {
  id: string
  name: string
  description: string | null
  permissions: string[]
  key_hint: string | null
  revoked: boolean
  last_used_at: string | null
  created_at: string
}

export interface CreatedKey extends OwnKey {
  api_key: string
}

interface Message {
  message: string
}

export type FeedbackType = 'suggestion' | 'bug' | 'other'

export const accountApi = {
  keys: () => authRequest<OwnKey[]>('/me/api-keys'),
  createKey: (name: string, permissions: string[] | null, description: string | null) =>
    authRequest<CreatedKey>('/me/api-keys', { method: 'POST', body: { name, permissions, description } }),
  revokeKey: (id: string) => authRequest<Message>(`/me/api-keys/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  feedback: (type: FeedbackType, message: string, email: string | null) =>
    authRequest<Message>('/support/feedback', { method: 'POST', body: form({ type, message, email }) }),
}
