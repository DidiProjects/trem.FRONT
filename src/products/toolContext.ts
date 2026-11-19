import { createContext, useContext } from 'react'
import type { ProductGroup, Tool } from './types'

export interface ToolValue {
  group: ProductGroup
  tool: Tool
}

/** The tool a page is rendered for, set by its route. */
export const ToolContext = createContext<ToolValue | null>(null)

export function useTool(): ToolValue {
  const value = useContext(ToolContext)
  if (!value) throw new Error('useTool outside a tool route')
  return value
}
