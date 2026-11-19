import type { ComponentType, LazyExoticComponent } from 'react'
import type { SvgIconComponent } from '@mui/icons-material'

export type GroupId = 'documents' | 'images' | 'media' | 'ai' | 'automation'

/** One tool of a product group, reachable at its own route. */
export interface Tool {
  id: string
  label: string
  description: string
  /** Absolute route, e.g. /documentos/juntar. */
  path: string
  /** Extra words the command palette matches. */
  keywords?: string
  /** MIME patterns ("application/pdf", "image/*") a dropped file must match to suggest it. */
  accepts?: string[]
  /** Short label for the Home suggestion after a drop, when different from `label`. */
  suggestion?: string
  page: LazyExoticComponent<ComponentType> | ComponentType
}

export interface ToolSection {
  title: string
  tools: Tool[]
}

/** A product: a group of tools with its own color, unlocked by one trem.API permission. */
export interface ProductGroup {
  id: GroupId
  label: string
  summary: string
  /** Route of the group's landing page. */
  path: string
  icon: SvgIconComponent
  permission: string
  /** Accent on dark backgrounds and its darker twin for light ones, both at WCAG AA. */
  color: { dark: string; light: string }
  sections: ToolSection[]
}
