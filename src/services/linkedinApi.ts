import { authRequest } from './session'

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'
export type Effort = 'low' | 'medium' | 'high'

export interface JobConfig {
  name: string
  jobs: { keywords: string[]; locations: string[]; max_pages: number }
  posts: { keywords: string[]; max_scrolls: number }
  analysis: { criteria: string; min_score: number; max_items: number; effort: Effort }
  schedule: { timezone: string; days: Weekday[]; times: string[] }
  notify_to: string
  expires_on: string | null
}

export type JobStatus = 'scheduled' | 'needs_cv' | 'needs_login' | 'paused' | 'halted' | 'expired'

export interface ScraperJob {
  id: string
  status: JobStatus
  state: 'active' | 'paused'
  config: JobConfig
  halt_reason?: string | null
  last_run?: { started_at: string; collected: number; error?: string | null } | null
  next_run_at?: string | null
  run_requested?: boolean
  pending_items?: number
  has_cv?: boolean
}

export interface Match {
  title?: string | null
  author?: string | null
  url: string
  company?: string | null
  location?: string | null
  score: number
  relevant?: boolean
  reason?: string | null
  analyzed_at?: string | null
  notified_at?: string | null
}

export type SessionState = 'valid' | 'expired' | 'none'
export interface LoginStart {
  id: string
  url: string
}
export type LoginStatus = 'starting' | 'waiting' | 'connected' | 'failed' | 'expired' | 'cancelled'

const BASE = '/scrapers/linkedin'
const job = (id: string) => `${BASE}/jobs/${encodeURIComponent(id)}`

export const linkedinApi = {
  session: () => authRequest<{ state: SessionState }>(`${BASE}/session`),
  disconnect: () => authRequest<void>(`${BASE}/session`, { method: 'DELETE' }),
  startLogin: () => authRequest<LoginStart>(`${BASE}/session/login`, { method: 'POST' }),
  loginState: (id: string) => authRequest<{ status: LoginStatus }>(`${BASE}/session/login/${encodeURIComponent(id)}`),
  cancelLogin: (id: string) => authRequest<void>(`${BASE}/session/login/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  jobs: () => authRequest<ScraperJob[]>(`${BASE}/jobs`),
  create: (config: JobConfig) => authRequest<ScraperJob>(`${BASE}/jobs`, { method: 'POST', body: config }),
  update: (id: string, config: JobConfig) => authRequest<ScraperJob>(job(id), { method: 'PATCH', body: config }),
  remove: (id: string) => authRequest<void>(job(id), { method: 'DELETE' }),
  run: (id: string) => authRequest<unknown>(`${job(id)}/run`, { method: 'POST' }),
  pause: (id: string) => authRequest<unknown>(`${job(id)}/pause`, { method: 'POST' }),
  resume: (id: string) => authRequest<unknown>(`${job(id)}/resume`, { method: 'POST' }),
  uploadCv: (id: string, file: File) => {
    const body = new FormData()
    body.append('file', file)
    return authRequest<void>(`${job(id)}/cv`, { method: 'PUT', body })
  },
  matches: (id: string, minScore: number) => authRequest<Match[]>(`${job(id)}/matches?min_score=${minScore}&limit=200`),
}

/** Only LinkedIn addresses become links: the URLs come from scraped pages. */
export function safeLinkedinUrl(url: string): string | null {
  return /^https:\/\/www\.linkedin\.com\//.test(url) ? url : null
}
