import { ApiError } from './http'
import { authRequest } from './session'

export type ModelStatus = 'healthy' | 'sleeping' | 'warming_up' | 'offline'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface Completion {
  choices?: { message?: { content?: string; reasoning_content?: string } }[]
  usage?: { completion_tokens?: number }
}

export interface LlmJob {
  job_id: string
  status: 'queued' | 'running' | 'done' | 'failed'
  result?: Completion
  error?: string
}

/** trem.API refuses /llm bodies above 64 KB; this leaves room for the JSON around them. */
export const MAX_BODY = 60_000

export const llmApi = {
  async health(): Promise<ModelStatus> {
    try {
      const { status } = await authRequest<{ status: ModelStatus }>('/llm/health')
      return status
    } catch (error) {
      if (error instanceof ApiError && error.status === 503) return 'offline'
      throw error
    }
  },

  /** Starts loading a sleeping model; trem.API answers 503 "warming up" at once. */
  async wake(): Promise<void> {
    await authRequest('/llm/v1/chat/completions', {
      method: 'POST',
      body: { messages: [{ role: 'user', content: 'ping' }], max_tokens: 1 },
    }).catch(() => undefined)
  },

  submit: (messages: ChatMessage[]) => authRequest<LlmJob>('/llm/jobs', { method: 'POST', body: { messages } }),

  job: (id: string) => authRequest<LlmJob>(`/llm/jobs/${encodeURIComponent(id)}`),
}

export function answerOf(job: LlmJob): string {
  return job.result?.choices?.[0]?.message?.content?.trim() ?? ''
}

/**
 * The most recent messages that fit the body limit, starting at a user message.
 * `trimmed` says older ones were left out.
 */
export function context(messages: ChatMessage[]): { messages: ChatMessage[]; fits: boolean; trimmed: boolean } {
  const size = (list: ChatMessage[]) => new TextEncoder().encode(JSON.stringify({ messages: list })).length
  const kept = [...messages]
  while (kept.length > 1 && size(kept) > MAX_BODY) kept.shift()
  while (kept.length > 1 && kept[0].role !== 'user') kept.shift()
  return { messages: kept, fits: size(kept) <= MAX_BODY, trimmed: kept.length < messages.length }
}
