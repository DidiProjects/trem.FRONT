import { baseName, form, postForFile, postForJson, type FileResult } from './filesApi'

interface Dimensions {
  width: number
  height: number
}

interface CompressAnswer {
  metrics: {
    original_size_bytes: number
    compressed_size_bytes: number
    reduction_percent: number
    original_dimensions: Dimensions
    final_dimensions: Dimensions
  }
  file: { filename: string; media_type: string; size_bytes: number; base64: string }
}

export interface Compressed {
  file: FileResult
  originalBytes: number
  reductionPercent: number
  original: Dimensions
  final: Dimensions
}

export type OutputFormat = 'jpeg' | 'png' | 'webp' | 'gif' | 'bmp' | 'tiff'
export type PdfLayout = 'single' | 'grouped'

const EXT: Record<OutputFormat, string> = { jpeg: 'jpg', png: 'png', webp: 'webp', gif: 'gif', bmp: 'bmp', tiff: 'tiff' }

function decode(base64: string, type: string): Blob {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  return new Blob([bytes], { type })
}

export const imageApi = {
  /**
   * Same format, smaller file. Asked as JSON: the size figures come in the body,
   * while the X-* headers of the binary answer are hidden from this origin by CORS.
   */
  compress: async (file: File, quality: number, maxDimension: number | null): Promise<Compressed> => {
    const answer = await postForJson<CompressAnswer>(
      '/image/compress',
      form({ file, quality, max_dimension: maxDimension, response_type: 'json' }),
    )
    return {
      file: { blob: decode(answer.file.base64, answer.file.media_type), name: answer.file.filename },
      originalBytes: answer.metrics.original_size_bytes,
      reductionPercent: answer.metrics.reduction_percent,
      original: answer.metrics.original_dimensions,
      final: answer.metrics.final_dimensions,
    }
  },

  convert: (file: File, format: OutputFormat, quality: number) =>
    postForFile('/image/convert', form({ file, format, quality }), `${baseName(file.name)}.${EXT[format]}`),

  toPdf: (files: File[], layout: PdfLayout, perPage: number) =>
    postForFile('/image/to-pdf', form({ files, layout, images_per_page: perPage }), `${baseName(files[0].name)}.pdf`),
}
