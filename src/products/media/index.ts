import { lazy } from 'react'
import type { ToolSection } from '../types'
import { MEDIA } from './paths'

const MEDIA_TYPES = ['video/*', 'audio/*']

export const mediaSections: ToolSection[] = [
  {
    title: 'Áudio e vídeo',
    tools: [
      {
        id: 'transcribe',
        label: 'Transcrever',
        description: 'Áudio ou vídeo vira texto com o tempo de cada trecho, e legenda SRT.',
        path: MEDIA.transcribe,
        keywords: 'texto legenda srt fala reuniao podcast',
        accepts: MEDIA_TYPES,
        page: lazy(() => import('./TranscribePage')),
      },
      {
        id: 'cut',
        label: 'Cortar áudio ou vídeo',
        description: 'Marque o início e o fim e baixe só o trecho.',
        path: MEDIA.cut,
        keywords: 'recortar trecho clip editar',
        accepts: MEDIA_TYPES,
        suggestion: 'Cortar um trecho',
        page: lazy(() => import('./CutPage')),
      },
    ],
  },
]
