import { baseName, form, postForFile, postForJson, type FileResult } from './filesApi'

export interface PdfInfo {
  filename: string
  pages: number
  encrypted: boolean
  pdf_version: string
  metadata: Record<string, string | null> | null
}

export interface PdfText {
  filename: string
  total_pages: number
  pages: string[]
}

export type ImageFormat = 'png' | 'jpeg' | 'tiff'
export type AccountType = 'CHECKING' | 'SAVINGS' | 'CREDITCARD'

const ext: Record<ImageFormat, string> = { png: 'png', jpeg: 'jpg', tiff: 'tiff' }

export const pdfApi = {
  merge: (files: File[], name: string): Promise<FileResult> => postForFile('/pdf/merge', form({ files }), name),

  /** Keeps only these pages ("1-3, 5"), in one PDF. */
  select: (file: File, pages: string) => postForFile('/pdf/split', form({ file, pages }), `${baseName(file.name)}-paginas.pdf`),

  /** Every page as its own PDF, in a zip. */
  explode: (file: File) => postForFile('/pdf/extract-pages', form({ file }), `${baseName(file.name)}-paginas.zip`),

  protect: (file: File, password: string, ownerPassword?: string) =>
    postForFile('/pdf/add-password', form({ file, user_password: password, owner_password: ownerPassword }), `${baseName(file.name)}-protegido.pdf`),

  unlock: (file: File, password: string) =>
    postForFile('/pdf/remove-password', form({ file, password }), `${baseName(file.name)}-sem-senha.pdf`),

  info: (file: File) => postForJson<PdfInfo>('/pdf/info', form({ file })),

  /** One image, or a zip when more than one page is converted. */
  toImages: (file: File, format: ImageFormat, dpi: number, pages: string, single: boolean) =>
    postForFile(
      '/pdf/convert-to-image',
      form({ file, format, dpi, pages }),
      single ? `${baseName(file.name)}.${ext[format]}` : `${baseName(file.name)}-imagens.zip`,
    ),

  toOfx: (file: File, bankId: string, accountId: string, accountType: AccountType) =>
    postForFile(
      '/pdf/convert-to-ofx',
      form({ file, bank_id: bankId, account_id: accountId, account_type: accountType }),
      `${baseName(file.name)}.ofx`,
    ),

  text: (file: File) => postForJson<PdfText>('/pdf/extract-text', form({ file })),
}

/** Page numbers from "1-3, 5", or an error message; `total` bounds them when known. */
export function parsePages(input: string, total?: number): { pages: number[] } | { error: string } {
  const pages = new Set<number>()
  for (const part of input.split(',').map((p) => p.trim()).filter(Boolean)) {
    const range = /^(\d+)\s*-\s*(\d+)$/.exec(part)
    const single = /^\d+$/.test(part) ? Number(part) : null
    const [from, to] = range ? [Number(range[1]), Number(range[2])] : single ? [single, single] : [NaN, NaN]
    if (!Number.isInteger(from) || from < 1 || to < from) return { error: `“${part}” não é uma página nem um intervalo como 2-5.` }
    if (total && to > total) return { error: `O arquivo tem ${total} páginas; “${part}” passa disso.` }
    for (let p = from; p <= to; p++) pages.add(p)
  }
  if (!pages.size) return { error: 'Informe as páginas, por exemplo 1-3, 5.' }
  return { pages: [...pages].sort((a, b) => a - b) }
}
