import { useEffect } from 'react'
import { ApiError } from '@/services/http'
import { mediaApi } from '@/services/mediaApi'
import { taskStore } from './store'

const POLL_MS = 3000
const uploads = new Map<string, AbortController>()

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`
}

/**
 * Sends the file and leaves the task in the store; the upload goes on while the app is
 * open, on any page. Returns the task id at once.
 */
export function startTranscription(file: File, language: string | null): string {
  const id = newId()
  const controller = new AbortController()
  uploads.set(id, controller)
  taskStore.add({ id, kind: 'transcription', fileName: file.name, startedAt: Date.now(), status: 'uploading', progress: 0 })

  mediaApi
    .transcribe(file, language, (progress) => taskStore.update(id, { progress }), controller.signal)
    .then((jobRef) => {
      taskStore.update(id, { jobRef, status: 'queued', progress: 1 })
      void pollOnce()
    })
    .catch((error: unknown) => {
      if (controller.signal.aborted) taskStore.remove(id)
      else taskStore.update(id, { status: 'failed', error: error instanceof Error ? error.message : 'O envio falhou.', finishedAt: Date.now() })
    })
    .finally(() => uploads.delete(id))
  return id
}

export function cancelUpload(id: string) {
  uploads.get(id)?.abort()
}

async function pollOnce() {
  for (const task of taskStore.all()) {
    if (!task.jobRef || (task.status !== 'queued' && task.status !== 'running')) continue
    try {
      const job = await mediaApi.job(task.jobRef)
      if (job.status === 'done') taskStore.update(task.id, { status: 'done', result: job.result, finishedAt: Date.now() })
      else if (job.status === 'failed') taskStore.update(task.id, { status: 'failed', error: job.error ?? 'A transcrição falhou.', finishedAt: Date.now() })
      else if (job.status !== task.status) taskStore.update(task.id, { status: job.status })
    } catch (error) {
      // Jobs live in trem.API's memory: a restart or the expiry loses them.
      if (error instanceof ApiError && error.status === 404) {
        taskStore.update(task.id, { status: 'failed', error: 'O servidor reiniciou ou o resultado expirou. Envie de novo.', finishedAt: Date.now() })
      }
    }
  }
}

/** Loads the account's tasks and follows the running ones while the app is open. */
export function useTaskRunner(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return
    taskStore.open(userId)
    void pollOnce()
    const timer = setInterval(() => void pollOnce(), POLL_MS)
    return () => clearInterval(timer)
  }, [userId])
}
