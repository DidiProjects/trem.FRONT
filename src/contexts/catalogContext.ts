import { createContext, useContext } from 'react'
import type { Load } from '@/hooks/useLoad'
import type { CatalogService } from '@/services/hubApi'

export interface CatalogValue {
  result: Load<CatalogService[]>
  reload: () => void
}

/** The account's services, loaded once by the layout for the menu, Home and the palette. */
export const CatalogContext = createContext<CatalogValue | null>(null)

export function useCatalog(): CatalogValue {
  const value = useContext(CatalogContext)
  if (!value) throw new Error('useCatalog outside CatalogContext')
  return value
}
