import { useSyncExternalStore } from 'react'
import type { Transcript } from '@/services/mediaApi'
import { storage } from '@/utils/storage'

export type TaskStatus = 'uploading' | 'queued' | 'running' | 'done' | 'failed'

/** Work that runs on the server after the page sends it: today, transcriptions. */
export interface Task {
  id: string
  kind: 'transcription'
  fileName: string
  startedAt: number
  status: TaskStatus
  /** Upload share sent, 0 to 1, while uploading. */
  progress?: number
  /** trem.API job, "<prefix>:<id>", once the upload is complete. */
  jobRef?: string
  result?: Transcript
  error?: string
  finishedAt?: number
}

export const STATUS_LABEL: Record<Task['status'], string> = {
  uploading: 'Enviando',
  queued: 'Na fila',
  running: 'Transcrevendo',
  done: 'Pronta',
  failed: 'Com erro',
}

const KEY = 'trem.tasks'
const KEEP = 20

let owner: string | null = null
let tasks: Task[] = []
const listeners = new Set<() => void>()

function persist() {
  if (!owner) return
  // A page closed mid-upload cannot resume it: those are saved as failed.
  const saved = tasks.map((t) => (t.status === 'uploading' ? { ...t, status: 'failed' as const, error: 'A página fechou antes de terminar o envio.' } : t))
  storage.set(`${KEY}.${owner}`, JSON.stringify(saved.slice(0, KEEP)))
}

function emit() {
  persist()
  listeners.forEach((l) => l())
}

export const taskStore = {
  /** Loads this account's tasks; called when the layout mounts. */
  open(userId: string) {
    if (owner === userId) return
    owner = userId
    try {
      const parsed: unknown = JSON.parse(storage.get(`${KEY}.${userId}`) ?? '[]')
      tasks = Array.isArray(parsed) ? (parsed as Task[]) : []
    } catch {
      tasks = []
    }
    listeners.forEach((l) => l())
  },

  close() {
    owner = null
    tasks = []
    listeners.forEach((l) => l())
  },

  all: () => tasks,
  get: (id: string) => tasks.find((t) => t.id === id),

  add(task: Task) {
    tasks = [task, ...tasks].slice(0, KEEP)
    emit()
  },

  update(id: string, patch: Partial<Task>) {
    tasks = tasks.map((t) => (t.id === id ? { ...t, ...patch } : t))
    emit()
  },

  remove(id: string) {
    tasks = tasks.filter((t) => t.id !== id)
    emit()
  },

  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}

export function useTasks(): Task[] {
  return useSyncExternalStore(taskStore.subscribe, taskStore.all)
}

export function useTask(id: string | null): Task | undefined {
  const all = useTasks()
  return id ? all.find((t) => t.id === id) : undefined
}

export const isActive = (t: Task) => t.status === 'uploading' || t.status === 'queued' || t.status === 'running'
