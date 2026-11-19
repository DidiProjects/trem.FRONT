import { Box, Typography } from '@mui/material'
import { PageHeader } from '@/components/PageHeader'
import { GroupBadge } from '@/products/GroupBadge'
import { GroupScope } from '@/products/GroupScope'
import { ToolCard } from '@/products/ToolCard'
import type { ProductGroup } from '@/products/types'

/** A product's landing page: its tools, sorted by what people want to do. */
export function GroupPage({ group }: { group: ProductGroup }) {
  return (
    <GroupScope group={group}>
      <Box sx={{ height: 6, borderRadius: '3px', bgcolor: 'var(--group)', mb: 3 }} />
      <PageHeader
        icon={<GroupBadge group={group} size={60} solid />}
        crumbs={[{ label: 'Produtos' }]}
        title={group.label}
        subtitle={group.summary}
      />
      <Box sx={{ display: 'grid', gap: 4 }}>
        {group.sections.map((section) => (
          <Box component="section" key={section.title} aria-label={section.title}>
            {group.sections.length > 1 && (
              <Typography variant="h2" sx={{ mb: 1.5 }}>
                {section.title}
              </Typography>
            )}
            <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))' }}>
              {section.tools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </Box>
          </Box>
        ))}
      </Box>
    </GroupScope>
  )
}
