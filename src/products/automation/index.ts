import { lazy } from 'react'
import type { ToolSection } from '../types'

export const automationSections: ToolSection[] = [
  {
    title: 'Automação',
    tools: [
      {
        id: 'linkedin',
        label: 'Vagas no LinkedIn',
        description: 'Buscas que rodam sozinhas, comparam as vagas com o seu currículo e mandam as melhores por e-mail.',
        path: '/automacoes/linkedin',
        keywords: 'emprego vaga trabalho curriculo scraper',
        page: lazy(() => import('./LinkedInPage')),
      },
    ],
  },
]
