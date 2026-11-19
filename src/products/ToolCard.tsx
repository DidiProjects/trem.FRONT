import { Link as RouterLink } from 'react-router'
import { Box, Typography } from '@mui/material'
import type { Tool } from './types'

/** A tool as a link card; the accent comes from the enclosing GroupScope. */
export function ToolCard({ tool, onOpen }: { tool: Tool; onOpen?: () => void }) {
  return (
    <Box
      component={RouterLink}
      to={tool.path}
      onClick={onOpen}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 0.75,
        p: 2.25,
        minHeight: 44,
        borderRadius: '20px',
        bgcolor: 'background.paper',
        color: 'text.primary',
        textDecoration: 'none',
        border: 1,
        borderColor: 'divider',
        transition: 'border-color .15s ease',
        '&:hover': { borderColor: 'var(--group)' },
        '&:focus-visible': { outline: '3px solid var(--group)', outlineOffset: 2 },
      }}
    >
      <Typography component="span" sx={{ fontWeight: 800, fontSize: 17 }}>
        {tool.label}
      </Typography>
      <Typography component="span" variant="body2" color="text.secondary">
        {tool.description}
      </Typography>
    </Box>
  )
}
