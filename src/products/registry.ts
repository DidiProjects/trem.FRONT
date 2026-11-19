import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined'
import ImageOutlined from '@mui/icons-material/ImageOutlined'
import GraphicEqOutlined from '@mui/icons-material/GraphicEqOutlined'
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined'
import BoltOutlined from '@mui/icons-material/BoltOutlined'
import { aiSections } from './ai'
import { automationSections } from './automation'
import { documentSections } from './documents'
import { imageSections } from './images'
import { mediaSections } from './media'
import type { GroupId, ProductGroup, Tool } from './types'

export const FILE_EDITOR = 'trem:file_editor'
export const AI = 'trem:ai'
export const LINKEDIN_SCRAPER = 'trem:linkedin_scraper'

/** Every product group, in menu order. A group without tools is not shown anywhere. */
export const GROUPS: ProductGroup[] = [
  {
    id: 'documents',
    label: 'Documentos',
    summary: 'Juntar, dividir, converter e proteger PDFs.',
    path: '/documentos',
    icon: DescriptionOutlined,
    permission: FILE_EDITOR,
    color: { dark: '#4dd4ff', light: '#0a6f96' },
    sections: documentSections,
  },
  {
    id: 'images',
    label: 'Imagens',
    summary: 'Comprimir, converter e transformar fotos em PDF.',
    path: '/imagens',
    icon: ImageOutlined,
    permission: FILE_EDITOR,
    color: { dark: '#3ee0a1', light: '#0b7a52' },
    sections: imageSections,
  },
  {
    id: 'media',
    label: 'Áudio e vídeo',
    summary: 'Cortar trechos e transcrever falas.',
    path: '/midia',
    icon: GraphicEqOutlined,
    permission: FILE_EDITOR,
    color: { dark: '#a393ff', light: '#5b3fd1' },
    sections: mediaSections,
  },
  {
    id: 'ai',
    label: 'IA',
    summary: 'Conversar com o modelo que roda no servidor.',
    path: '/ia',
    icon: AutoAwesomeOutlined,
    permission: AI,
    color: { dark: '#ff5c8a', light: '#b8235a' },
    sections: aiSections,
  },
  {
    id: 'automation',
    label: 'Automação',
    summary: 'Tarefas que rodam sozinhas no horário marcado.',
    path: '/automacoes',
    icon: BoltOutlined,
    permission: LINKEDIN_SCRAPER,
    color: { dark: '#ffc23d', light: '#8a5a00' },
    sections: automationSections,
  },
]

export function toolsOf(group: ProductGroup): Tool[] {
  return group.sections.flatMap((s) => s.tools)
}

/** The groups this account may use, leaving out groups with no tools yet. */
export function groupsFor(permissions: readonly string[] | undefined): ProductGroup[] {
  const granted = new Set(permissions ?? [])
  return GROUPS.filter((g) => granted.has(g.permission) && toolsOf(g).length > 0)
}

export function groupById(id: GroupId): ProductGroup {
  const group = GROUPS.find((g) => g.id === id)
  if (!group) throw new Error(`Unknown group ${id}`)
  return group
}

/** The group and tool a route belongs to, if any. */
export function locate(pathname: string): { group?: ProductGroup; tool?: Tool } {
  const group = GROUPS.find((g) => pathname === g.path || pathname.startsWith(`${g.path}/`))
  const tool = group && toolsOf(group).find((t) => pathname === t.path || pathname.startsWith(`${t.path}/`))
  return { group, tool }
}

function matches(type: string, pattern: string): boolean {
  return pattern.endsWith('/*') ? type.startsWith(pattern.slice(0, -1)) : type === pattern
}

/** Tools that take this file, for the suggestions after a drop on Home. */
export function toolsForFile(file: File, groups: ProductGroup[]): { group: ProductGroup; tool: Tool }[] {
  const type = file.type || guessType(file.name)
  return groups.flatMap((group) =>
    toolsOf(group)
      .filter((tool) => tool.accepts?.some((p) => matches(type, p)))
      .map((tool) => ({ group, tool })),
  )
}

// Some systems hand over files without a MIME type (e.g. .mkv on Windows).
function guessType(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'pdf') return 'application/pdf'
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tif', 'tiff', 'heic', 'avif'].includes(ext)) return `image/${ext}`
  if (['mp4', 'mkv', 'mov', 'avi', 'webm'].includes(ext)) return `video/${ext}`
  if (['mp3', 'm4a', 'wav', 'ogg', 'flac', 'aac', 'opus'].includes(ext)) return `audio/${ext}`
  return ''
}
