import { Fragment } from 'react'
import { Box, Button, Chip, IconButton, TextField, Typography } from '@mui/material'
import Add from '@mui/icons-material/Add'
import Close from '@mui/icons-material/Close'
import { MAX_QUERY, toQuery, type Groups } from './terms'

interface Props {
  label: string
  helper: string
  groups: Groups
  onChange: (groups: Groups) => void
  placeholder?: string
}

const operator = (text: 'AND' | 'OR') => (
  <Chip label={text} size="small" sx={{ fontWeight: 800, letterSpacing: '0.04em', bgcolor: 'var(--group-soft)', color: 'text.primary' }} />
)

/**
 * One LinkedIn search built from columns: terms stacked in a column are alternatives (OR), and
 * columns side by side must all match (AND). The expression it sends is shown below.
 */
export function TermBuilder({ label, helper, groups, onChange, placeholder }: Props) {
  const query = toQuery(groups)
  const tooLong = query.length > MAX_QUERY
  const update = (g: number, t: number, value: string) => onChange(groups.map((col, i) => (i === g ? col.map((x, j) => (j === t ? value : x)) : col)))
  const addTerm = (g: number) => onChange(groups.map((col, i) => (i === g ? [...col, ''] : col)))
  const removeTerm = (g: number, t: number) => {
    const next = groups.map((col, i) => (i === g ? col.filter((_, j) => j !== t) : col)).filter((col) => col.length)
    onChange(next.length ? next : [['']])
  }

  return (
    <Box role="group" aria-label={label} sx={{ display: 'grid', gap: 1 }}>
      <Typography sx={{ fontWeight: 700 }}>{label}</Typography>
      <Typography variant="body2" color="text.secondary">
        {helper} Na vertical, as alternativas (OR); lado a lado, o que precisa aparecer junto (AND).
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
        {groups.map((col, g) => (
          <Fragment key={g}>
            {g > 0 && operator('AND')}
            <Box sx={{ display: 'grid', gap: 0.75, justifyItems: 'center', p: 1, border: 1, borderColor: 'divider', borderRadius: '12px', minWidth: 180, flex: '1 1 180px', maxWidth: 260 }}>
              {col.map((term, t) => (
                <Fragment key={t}>
                  {t > 0 && operator('OR')}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, width: '100%' }}>
                    <TextField
                      size="small"
                      fullWidth
                      value={term}
                      placeholder={g === 0 && t === 0 ? placeholder : undefined}
                      onChange={(e) => update(g, t, e.target.value)}
                      slotProps={{ htmlInput: { 'aria-label': `${label}: grupo ${g + 1}, termo ${t + 1}` } }}
                    />
                    {(col.length > 1 || groups.length > 1) && (
                      <IconButton size="small" aria-label={`${label}: remover termo ${t + 1} do grupo ${g + 1}`} onClick={() => removeTerm(g, t)}>
                        <Close fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                </Fragment>
              ))}
              <Button size="small" startIcon={<Add />} onClick={() => addTerm(g)} aria-label={`${label}: adicionar alternativa (OR) ao grupo ${g + 1}`}>
                OR
              </Button>
            </Box>
          </Fragment>
        ))}
        <Button size="small" variant="outlined" startIcon={<Add />} onClick={() => onChange([...groups, ['']])} aria-label={`${label}: adicionar grupo (AND)`}>
          AND
        </Button>
      </Box>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <Typography variant="body2" color="text.secondary">
          Busca no LinkedIn:
        </Typography>
        <Typography variant="body2" component="code" sx={{ fontFamily: 'monospace', wordBreak: 'break-word', flex: '1 1 240px' }}>
          {query || '—'}
        </Typography>
        <Typography variant="caption" color={tooLong ? 'error' : 'text.secondary'} sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {query.length}/{MAX_QUERY}
        </Typography>
      </Box>
    </Box>
  )
}
