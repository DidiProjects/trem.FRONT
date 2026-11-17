import { env } from '@/config/env'
import { authRequest } from './session'

/** A service the logged-in account may open. */
export interface CatalogService {
  slug: string
  name: string
  description: string | null
  url: string
  logo_url: string | null
}

export interface ManagedService {
  slug: string
  /** "hub:<slug>": the permission that shows the service to an account. */
  permission: string
  name: string
  description: string | null
  url: string | null
  enabled: boolean
  position: number
  logo_url: string | null
  created_at: string
  updated_at: string
}

export interface ServiceFields {
  name: string
  description: string | null
  url: string | null
  enabled: boolean
}

export interface ManagedUser {
  id: string
  username: string
  email: string | null
  status: string
  permissions: string[]
}

interface Page<T> {
  items: T[]
  total: number
}

interface Message {
  message: string
}

const ADMIN = '/admin/hub/services'
const at = (slug: string) => `${ADMIN}/${encodeURIComponent(slug)}`

/** Logo paths come from trem.API; the image is served from there. */
export function logoSrc(path: string | null): string | undefined {
  return path ? `${env.apiUrl}${path}` : undefined
}

export const hubApi = {
  catalog: () => authRequest<CatalogService[]>('/hub/services'),

  list: () => authRequest<ManagedService[]>(ADMIN),

  create: (slug: string, fields: ServiceFields) =>
    authRequest<ManagedService>(ADMIN, { method: 'POST', body: { slug, ...fields } }),

  update: (slug: string, fields: Partial<ServiceFields>) =>
    authRequest<ManagedService>(at(slug), { method: 'PATCH', body: fields }),

  reorder: (slugs: string[]) => authRequest<ManagedService[]>(`${ADMIN}/order`, { method: 'PUT', body: { slugs } }),

  remove: (slug: string) => authRequest<Message>(at(slug), { method: 'DELETE' }),

  uploadLogo: (slug: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return authRequest<ManagedService>(`${at(slug)}/logo`, { method: 'PUT', body: form })
  },

  removeLogo: (slug: string) => authRequest<ManagedService>(`${at(slug)}/logo`, { method: 'DELETE' }),

  grant: (slug: string, userId: string) =>
    authRequest<Message>(`${at(slug)}/users/${encodeURIComponent(userId)}`, { method: 'PUT' }),

  revoke: (slug: string, userId: string) =>
    authRequest<Message>(`${at(slug)}/users/${encodeURIComponent(userId)}`, { method: 'DELETE' }),

  /** Active accounts, the ones a service can be granted to. */
  activeUsers: () => authRequest<Page<ManagedUser>>('/admin/users?status=active&limit=200'),
}
