import { lazy } from 'react'
import type { ToolSection } from '../types'

export const CHAT_PATH = '/ia/conversa'

export const aiSections: ToolSection[] = [
  {
    title: 'IA',
    tools: [
      {
        id: 'chat',
        label: 'Conversar com a IA',
        description: 'Pergunte, resuma e escreva com o modelo que roda no servidor.',
        path: CHAT_PATH,
        keywords: 'chat llm modelo perguntar resumir escrever assistente',
        accepts: ['text/plain', 'text/markdown', 'text/csv'],
        suggestion: 'Perguntar à IA sobre o arquivo',
        page: lazy(() => import('./ChatPage')),
      },
    ],
  },
]
