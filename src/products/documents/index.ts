import { lazy } from 'react'
import type { ToolSection } from '../types'
import { DOCS } from './paths'

const PDF = ['application/pdf']

export const documentSections: ToolSection[] = [
  {
    title: 'Organizar',
    tools: [
      {
        id: 'merge',
        label: 'Juntar PDFs',
        description: 'Vários arquivos viram um, na ordem que você escolher.',
        path: DOCS.merge,
        keywords: 'unir combinar mesclar merge',
        accepts: PDF,
        suggestion: 'Juntar com outros PDFs',
        page: lazy(() => import('./MergePage')),
      },
      {
        id: 'select',
        label: 'Escolher páginas',
        description: 'Fica só com as páginas que você indicar, num PDF novo.',
        path: DOCS.select,
        keywords: 'dividir split recortar paginas extrair',
        accepts: PDF,
        page: lazy(() => import('./SelectPagesPage')),
      },
      {
        id: 'explode',
        label: 'Separar todas as páginas',
        description: 'Cada página vira um PDF, todos num .zip.',
        path: DOCS.explode,
        keywords: 'dividir split zip',
        page: lazy(() => import('./ExplodePage')),
      },
    ],
  },
  {
    title: 'Converter',
    tools: [
      {
        id: 'to-image',
        label: 'PDF para imagem',
        description: 'Cada página vira PNG, JPG ou TIFF.',
        path: DOCS.toImage,
        keywords: 'png jpg foto converter',
        accepts: PDF,
        page: lazy(() => import('./ToImagePage')),
      },
      {
        id: 'ofx',
        label: 'Extrato para OFX',
        description: 'O extrato do banco em PDF vira arquivo para o app financeiro.',
        path: DOCS.ofx,
        keywords: 'banco extrato financeiro ofx',
        page: lazy(() => import('./OfxPage')),
      },
      {
        id: 'text',
        label: 'Extrair texto',
        description: 'Copie o texto de cada página.',
        path: DOCS.text,
        keywords: 'copiar texto txt',
        accepts: PDF,
        page: lazy(() => import('./TextPage')),
      },
    ],
  },
  {
    title: 'Proteger',
    tools: [
      {
        id: 'protect',
        label: 'Colocar senha',
        description: 'Só abre quem souber a senha.',
        path: DOCS.protect,
        keywords: 'senha proteger criptografar',
        accepts: PDF,
        suggestion: 'Proteger com senha',
        page: lazy(() => import('./ProtectPage')),
      },
      {
        id: 'unlock',
        label: 'Tirar senha',
        description: 'Remove a senha de um PDF que você já sabe abrir.',
        path: DOCS.unlock,
        keywords: 'senha desbloquear remover',
        page: lazy(() => import('./UnlockPage')),
      },
    ],
  },
  {
    title: 'Ver detalhes',
    tools: [
      {
        id: 'info',
        label: 'Informações do PDF',
        description: 'Páginas, versão, autor e se tem senha.',
        path: DOCS.info,
        keywords: 'detalhes metadados paginas',
        page: lazy(() => import('./InfoPage')),
      },
    ],
  },
]
