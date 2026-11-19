import { authRequest } from './session'

export type UserStatus = 'active' | 'pending_approval' | 'pending_verification' | 'suspended' | 'rejected' | 'blocked'

export interface AdminUser {
  id: string
  username: string
  email: string | null
  permissions: string[]
  status: UserStatus
  must_change_password: boolean
  provisional_password_sent_at: string | null
  created_at: string
  last_login_at: string | null
  email_verified_at?: string | null
  totp_enabled?: boolean
}

export interface Page<T> {
  items: T[]
  total: number
  limit: number
  offset: number
}

export interface AppPermission {
  key: string
  name: string
  description: string | null
}

export interface Application {
  slug: string
  name: string
  description: string | null
  created_at: string
  permissions: AppPermission[]
}

export interface ServiceClient {
  id: string
  name: string
  description: string | null
  permissions: string[]
  user_id: string | null
  key_hint: string | null
  revoked: boolean
  last_used_at: string | null
  created_at: string
}

interface Message {
  message: string
}

const user = (id: string) => `/admin/users/${encodeURIComponent(id)}`
const app = (slug: string) => `/admin/applications/${encodeURIComponent(slug)}`

export const PAGE_SIZE = 50

export const adminApi = {
  users: (status: UserStatus | null, offset = 0) =>
    authRequest<Page<AdminUser>>(`/admin/users?${status ? `status=${status}&` : ''}limit=${PAGE_SIZE}&offset=${offset}`),
  approve: (id: string, permissions: string[]) => authRequest<AdminUser>(`${user(id)}/approve`, { method: 'POST', body: { permissions } }),
  reject: (id: string) => authRequest<AdminUser>(`${user(id)}/reject`, { method: 'POST' }),
  suspend: (id: string) => authRequest<AdminUser>(`${user(id)}/suspend`, { method: 'POST' }),
  reactivate: (id: string) => authRequest<AdminUser>(`${user(id)}/reactivate`, { method: 'POST' }),
  setPermissions: (id: string, permissions: string[]) => authRequest<AdminUser>(`${user(id)}/permissions`, { method: 'PUT', body: { permissions } }),
  createUser: (username: string, email: string | null, permissions: string[]) =>
    authRequest<AdminUser>('/users', { method: 'POST', body: { username, email, permissions } }),
  sendProvisional: (id: string) => authRequest<Message>(`/users/${encodeURIComponent(id)}/send-provisional-password`, { method: 'POST' }),

  applications: () => authRequest<Application[]>('/admin/applications'),
  createApplication: (slug: string, name: string, description: string | null) =>
    authRequest<Application>('/admin/applications', { method: 'POST', body: { slug, name, description } }),
  removeApplication: (slug: string) => authRequest<Message>(app(slug), { method: 'DELETE' }),
  addPermission: (slug: string, name: string, description: string | null) =>
    authRequest<AppPermission>(`${app(slug)}/permissions`, { method: 'POST', body: { name, description } }),
  removePermission: (slug: string, name: string) => authRequest<Message>(`${app(slug)}/permissions/${encodeURIComponent(name)}`, { method: 'DELETE' }),

  clients: () => authRequest<Page<ServiceClient>>('/admin/clients?limit=200'),
  createClient: (name: string, permissions: string[], description: string | null) =>
    authRequest<ServiceClient & { api_key: string }>('/admin/clients', { method: 'POST', body: { name, permissions, description } }),
  revokeClient: (id: string) => authRequest<Message>(`/admin/clients/${encodeURIComponent(id)}`, { method: 'DELETE' }),
}
