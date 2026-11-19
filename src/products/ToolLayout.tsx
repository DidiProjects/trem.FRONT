import { useEffect, type ReactNode } from 'react'
import { Box } from '@mui/material'
import { PageHeader } from '@/components/PageHeader'
import { useAuth } from '@/hooks/useAuth'
import { GroupScope } from './GroupScope'
import { recent } from './recent'
import type { ProductGroup, Tool } from './types'

interface Props {
  group: ProductGroup
  tool: Tool
  /** Overrides the tool's description under the title. */
  subtitle?: ReactNode
  actions?: ReactNode
  children: ReactNode
}

/** Frame of every tool page: the group's color band, breadcrumb and title. */
export function ToolLayout({ group, tool, subtitle, actions, children }: Props) {
  const { user } = useAuth()
  const userId = user?.id

  useEffect(() => {
    if (userId) recent.touch(userId, tool.path)
  }, [userId, tool.path])

  return (
    <GroupScope group={group}>
      <Box sx={{ height: 6, borderRadius: '3px', bgcolor: 'var(--group)', mb: 3 }} />
      <PageHeader
        crumbs={[{ label: group.label, to: group.path }, { label: tool.label }]}
        title={tool.label}
        subtitle={subtitle ?? tool.description}
        actions={actions}
      />
      {children}
    </GroupScope>
  )
}
