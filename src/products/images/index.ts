import { lazy } from 'react'
import type { ToolSection } from '../types'
import { IMAGES } from './paths'

const IMAGE = ['image/*']

export const imageSections: ToolSection[] = [
  {
    title: 'Imagens',
    tools: [
      {
        id: 'compress',
        label: 'Comprimir imagem',
        description: 'Diminua o arquivo e compare antes e depois.',
        path: IMAGES.compress,
        keywords: 'reduzir diminuir tamanho otimizar foto',
        accepts: IMAGE,
        suggestion: 'Comprimir',
        page: lazy(() => import('./CompressPage')),
      },
      {
        id: 'convert',
        label: 'Converter imagem',
        description: 'WebP, JPG, PNG e outros. HEIC do iPhone também.',
        path: IMAGES.convert,
        keywords: 'formato webp png jpg heic foto',
        accepts: IMAGE,
        suggestion: 'Converter formato',
        page: lazy(() => import('./ConvertPage')),
      },
      {
        id: 'to-pdf',
        label: 'Imagens para PDF',
        description: 'Junte fotos e prints num PDF só.',
        path: IMAGES.toPdf,
        keywords: 'foto documento digitalizar scanner',
        accepts: IMAGE,
        suggestion: 'Transformar em PDF',
        page: lazy(() => import('./ToPdfPage')),
      },
    ],
  },
]
