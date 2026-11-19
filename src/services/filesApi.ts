import { ApiError, toApiError } from './http'
import { authSend } from './session'

/** A file produced by trem.API, named by the front: its Content-Disposition is not exposed to other origins. */
export interface FileResult {
  blob: Blob
  name: string
}

export const MB = 1024 * 1024
/** trem.API refuses PDFs above this size. */
export const PDF_MAX = 50 * MB
/** Cloudflare, in front of trem.API, drops requests above 100 MB. */
export const REQUEST_MAX = 100 * MB

const STATUS: Record<number, string> = {
  413: 'O arquivo é grande demais para o servidor.',
  415: 'Esse tipo de arquivo não é aceito aqui.',
  429: 'Muitas tentativas seguidas. Espere um pouco e tente de novo.',
  502: 'O servidor não conseguiu processar agora. Tente de novo em instantes.',
  504: 'O servidor demorou demais para responder. Tente com um arquivo menor.',
  524: 'O servidor demorou demais para responder. Tente com um arquivo menor.',
}

// trem.API messages that come in English.
const ENGLISH: [RegExp, (m: RegExpExecArray) => string][] = [
  [/^Incorrect password/i, () => 'Senha incorreta.'],
  [/^Could not extract transactions/i, () => 'Não encontrei lançamentos nesse PDF. Confira se é o extrato original do banco.'],
  [/^File exceeds maximum size of (\d+)MB/i, (m) => `O arquivo passa do limite de ${m[1]} MB.`],
  [/^File must have \.pdf extension|^File is not a valid PDF/i, () => 'Esse arquivo não é um PDF válido.'],
  [/^File is empty/i, () => 'O arquivo está vazio.'],
]

async function failure(res: Response): Promise<ApiError> {
  const error = await toApiError(res)
  const known = STATUS[res.status]
  // Proxies answer these with HTML, and trem.API answers PDF processing errors in
  // English ("Error processing PDF: ..."): both get a message in Portuguese.
  if (known) return new ApiError(known, res.status)
  // The page parser's 400 comes wrapped: "Error processing PDF: 400: Invalid range: 9-12".
  const page = /Invalid (?:page|range): (.+)$/i.exec(error.message)
  if (page) return new ApiError(`“${page[1]}” passa do número de páginas do arquivo.`, res.status)
  for (const [pattern, message] of ENGLISH) {
    const match = pattern.exec(error.message)
    if (match) return new ApiError(message(match), res.status)
  }
  if (/^Error processing/i.test(error.message)) {
    return new ApiError('Não foi possível ler o arquivo. Ele pode estar corrompido ou protegido por senha.', res.status)
  }
  return error
}

export function form(fields: Record<string, string | number | boolean | Blob | Blob[] | null | undefined>): FormData {
  const body = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    if (value === null || value === undefined || value === '') continue
    if (Array.isArray(value)) value.forEach((v) => body.append(key, v, v instanceof File ? v.name : undefined))
    else if (value instanceof Blob) body.append(key, value, value instanceof File ? value.name : undefined)
    else body.append(key, String(value))
  }
  return body
}

/** POSTs a form and returns the file it answers with. */
export async function postForFile(path: string, body: FormData, name: string): Promise<FileResult> {
  const res = await authSend(path, { method: 'POST', body })
  if (!res.ok) throw await failure(res)
  return { blob: await res.blob(), name }
}

export async function postForJson<T>(path: string, body: FormData): Promise<T> {
  const res = await authSend(path, { method: 'POST', body })
  if (!res.ok) throw await failure(res)
  return (await res.json()) as T
}

/** "contrato.pdf" -> "contrato". */
export function baseName(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(0, dot) : name
}
