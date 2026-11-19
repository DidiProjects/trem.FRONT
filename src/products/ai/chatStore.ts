import { useSyncExternalStore } from 'react'
import { ApiError } from '@/services/http'
import { answerOf, context, llmApi, type ChatMessage } from '@/services/llmApi'
import { storage } from '@/utils/storage'

export interface Pending {
  jobId: string | null
  status: 'sending' | 'queued' | 'running'
  since: number
}

export interface Chat {
  id: string
  title: string
  updatedAt: number
  messages: ChatMessage[]
  pending: Pending | null
  /** Why the last question got no answer, shown with a retry. */
  error: string | null
}

const KEY = 'trem.chats'
const POLL_MS = 2500
const KEEP = 50

let owner: string | null = null
let chats: Chat[] = []
const listeners = new Set<() => void>()
const polling = new Set<string>()

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`
}

function emit() {
  if (owner) storage.set(`${KEY}.${owner}`, JSON.stringify(chats.slice(0, KEEP)))
  listeners.forEach((l) => l())
}

function patch(id: string, change: Partial<Chat>) {
  chats = chats.map((c) => (c.id === id ? { ...c, ...change, updatedAt: Date.now() } : c))
  emit()
}

const find = (id: string) => chats.find((c) => c.id === id)

async function follow(id: string) {
  if (polling.has(id)) return
  polling.add(id)
  try {
    for (;;) {
      await sleep(POLL_MS)
      const jobId = find(id)?.pending?.jobId
      if (!jobId) return
      let job
      try {
        job = await llmApi.job(jobId)
      } catch (error) {
        if (find(id)?.pending?.jobId !== jobId) return
        const lost = error instanceof ApiError && error.status === 404
        patch(id, { pending: null, error: lost ? 'A resposta se perdeu: o servidor reiniciou ou ela expirou. Tente de novo.' : (error as Error).message })
        return
      }
      const chat = find(id)
      if (chat?.pending?.jobId !== jobId) return
      if (job.status === 'done') patch(id, { pending: null, messages: [...chat.messages, { role: 'assistant', content: answerOf(job) }] })
      else if (job.status === 'failed') patch(id, { pending: null, error: job.error ?? 'O modelo não respondeu. Tente de novo.' })
      else if (job.status !== chat.pending.status) patch(id, { pending: { ...chat.pending, status: job.status } })
      if (job.status === 'done' || job.status === 'failed') return
    }
  } finally {
    polling.delete(id)
  }
}

async function ask(id: string) {
  const chat = find(id)
  if (!chat) return
  const ctx = context(chat.messages)
  if (!ctx.fits) {
    patch(id, { error: 'Essa mensagem é longa demais: o servidor aceita até uns 60 KB por pergunta.' })
    return
  }
  patch(id, { error: null, pending: { jobId: null, status: 'sending', since: Date.now() } })
  try {
    const job = await llmApi.submit(ctx.messages)
    if (!find(id)?.pending) return // stopped while sending
    patch(id, { pending: { jobId: job.job_id, status: job.status === 'running' ? 'running' : 'queued', since: find(id)!.pending!.since } })
    void follow(id)
  } catch (error) {
    if (find(id)?.pending) patch(id, { pending: null, error: error instanceof Error ? error.message : 'Não foi possível enviar.' })
  }
}

/** Conversations kept in this browser, per account; the server keeps nothing. */
export const chatStore = {
  open(userId: string) {
    if (owner === userId) return
    owner = userId
    try {
      const parsed: unknown = JSON.parse(storage.get(`${KEY}.${userId}`) ?? '[]')
      chats = Array.isArray(parsed) ? (parsed as Chat[]) : []
    } catch {
      chats = []
    }
    // A question that never reached the server cannot be resumed; one with a job can.
    chats = chats.map((c) => (c.pending && !c.pending.jobId ? { ...c, pending: null, error: 'A página fechou antes do envio. Tente de novo.' } : c))
    chats.filter((c) => c.pending?.jobId).forEach((c) => void follow(c.id))
    listeners.forEach((l) => l())
  },

  close() {
    owner = null
    chats = []
    listeners.forEach((l) => l())
  },

  all: () => chats,

  /** Sends `text` in the chat (a new one when `id` is null) and returns its id. */
  send(id: string | null, text: string): string {
    let chat = id ? find(id) : undefined
    if (!chat) {
      chat = { id: newId(), title: text.split('\n')[0].slice(0, 60), updatedAt: Date.now(), messages: [], pending: null, error: null }
      chats = [chat, ...chats]
    }
    patch(chat.id, { messages: [...chat.messages, { role: 'user', content: text }] })
    void ask(chat.id)
    return chat.id
  },

  retry: (id: string) => void ask(id),

  /** Stops waiting; trem.API has no cancel, the answer is just not shown. */
  stop: (id: string) => patch(id, { pending: null }),

  remove(id: string) {
    chats = chats.filter((c) => c.id !== id)
    emit()
  },

  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}

export function useChats(): Chat[] {
  return useSyncExternalStore(chatStore.subscribe, chatStore.all)
}
