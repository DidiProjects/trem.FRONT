import { storage } from '@/utils/storage'

const KEY = 'trem.recent'
const MAX = 6

export interface RecentEntry {
  path: string
  at: number
}

function key(userId: string) {
  return `${KEY}.${userId}`
}

function read(userId: string): RecentEntry[] {
  try {
    const parsed: unknown = JSON.parse(storage.get(key(userId)) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((e): e is RecentEntry => typeof e?.path === 'string' && typeof e?.at === 'number') : []
  } catch {
    return []
  }
}

/** Tools used last in this browser, per account: only routes, never file names. */
export const recent = {
  list: read,

  touch(userId: string, path: string) {
    const next = [{ path, at: Date.now() }, ...read(userId).filter((e) => e.path !== path)].slice(0, MAX)
    storage.set(key(userId), JSON.stringify(next))
  },
}
