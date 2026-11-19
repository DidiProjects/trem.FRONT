import { ApiError } from './http'
import { baseName, form, postForFile } from './filesApi'
import { authRequest } from './session'

export type MediaKind = 'video' | 'audio'

export interface Segment {
  start: number
  end: number
  text: string
}

export interface Transcript {
  text: string
  segments: Segment[]
  language: string | null
  duration: number | null
}

export interface TranscriptionJob {
  job_id: string
  status: 'queued' | 'running' | 'done' | 'failed'
  result?: Transcript
  error?: string
}

interface Upload {
  upload_id: string
  part_size: number
  total_parts: number
}

const PREFIX: Record<MediaKind, string> = { video: '/movie', audio: '/audio' }
const RETRIES = 3

export function mediaKind(file: File): MediaKind {
  return file.type.startsWith('audio/') || /\.(mp3|m4a|wav|ogg|flac|aac|opus)$/i.test(file.name) ? 'audio' : 'video'
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Network failures and 5xx/429 are worth another try; the caller's own errors are not. */
async function retrying<T>(request: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await request()
    } catch (error) {
      const retryable = error instanceof ApiError && (error.status === 0 || error.status >= 500 || error.status === 429)
      if (!retryable || attempt >= RETRIES) throw error
      await sleep(2000 * attempt)
    }
  }
}

export const mediaApi = {
  /** Video comes back as MP4; audio keeps its format. */
  cut: (file: File, start: number, end: number) => {
    const kind = mediaKind(file)
    const ext = kind === 'video' ? 'mp4' : (file.name.split('.').pop() ?? 'mp3')
    return postForFile(`${PREFIX[kind]}/cut`, form({ file, start, end }), `${baseName(file.name)}-trecho.${ext}`)
  },

  /**
   * Sends the file in parts (Cloudflare drops requests above 100 MB) and starts the
   * transcription; `onProgress` gets the share sent, 0 to 1. Returns the job id.
   */
  async transcribe(file: File, language: string | null, onProgress: (share: number) => void, signal: AbortSignal): Promise<string> {
    const prefix = PREFIX[mediaKind(file)]
    const upload = await retrying(() =>
      authRequest<Upload>(`${prefix}/transcribe/uploads`, { method: 'POST', body: { filename: file.name, size: file.size, language } }),
    )
    const base = `${prefix}/transcribe/uploads/${upload.upload_id}`
    try {
      for (let index = 0; index < upload.total_parts; index++) {
        if (signal.aborted) throw new DOMException('cancelled', 'AbortError')
        const part = file.slice(index * upload.part_size, (index + 1) * upload.part_size)
        await retrying(() =>
          authRequest<void>(`${base}/parts/${index}`, { method: 'PUT', body: part, headers: { 'Content-Type': 'application/octet-stream' } }),
        )
        onProgress((index + 1) / upload.total_parts)
      }
      const job = await retrying(() => authRequest<TranscriptionJob>(`${base}/complete`, { method: 'POST' }))
      return `${prefix}:${job.job_id}`
    } catch (error) {
      authRequest(base, { method: 'DELETE' }).catch(() => undefined)
      throw error
    }
  },

  /** `ref` is what transcribe returned: the route prefix and the job id. */
  job(ref: string): Promise<TranscriptionJob> {
    const [prefix, id] = ref.split(':')
    return authRequest<TranscriptionJob>(`${prefix}/transcribe/jobs/${encodeURIComponent(id)}`)
  },
}
