import { authRequest } from './session'

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

const app = (slug: string) => `/admin/applications/${encodeURIComponent(slug)}`

export const adminApi = {

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
