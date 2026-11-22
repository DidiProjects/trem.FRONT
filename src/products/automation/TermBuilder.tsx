import { Fragment } from 'react'
import { Box, Button, Chip, IconButton, TextField, Typography } from '@mui/material'
import Add from '@mui/icons-material/Add'
import Close from '@mui/icons-material/Close'
import { MAX_QUERY, MAX_TERMS, termCount, toQuery, type Rows } from './terms'

interface Props {
  label: string
  helper: string
  rows: Rows
  onChange: (rows: Rows) => void
  placeholder?: string
}

const operator = (text: 'AND' | 'OR') => (
  <Chip label={text} size="small" sx={{ fontWeight: 800, letterSpacing: '0.04em', bgcolor: 'var(--group-soft)', color: 'text.primary' }} />
)

/**
 * One LinkedIn post search built from rows: terms side by side must all appear (AND), and any
 * row is enough (OR). LinkedIn reads at most MAX_TERMS terms, so adding stops there.
 */
export function TermBuilder({ label, helper, rows, onChange, placeholder }: Props) {
  const query = toQuery(rows)
  const fields = rows.reduce((n, r) => n + r.length, 0)
  const full = fields >= MAX_TERMS
  const update = (r: number, t: number, value: string) => onChange(rows.map((row, i) => (i === r ? row.map((x, j) => (j === t ? value : x)) : row)))
  const addAnd = (r: number) => onChange(rows.map((row, i) => (i === r ? [...row, ''] : row)))
  const remove = (r: number, t: number) => {
    const next = rows.map((row, i) => (i === r ? row.filter((_, j) => j !== t) : row)).filter((row) => row.length)
    onChange(next.length ? next : [['']])
  }

  return (
    <Box role="group" aria-label={label} sx={{ display: 'grid', gap: 1 }}>
      <Typography sx={{ fontWeight: 700 }}>{label}</Typography>
      <Typography variant="body2" color="text.secondary">
        {helper} Lado a lado, o que precisa aparecer junto (AND); cada linha é uma alternativa (OR). O LinkedIn lê até{' '}
        {MAX_TERMS} termos por busca.
      </Typography>
      <Box sx={{ display: 'grid', gap: 1, justifyItems: 'start' }}>
        {rows.map((row, r) => (
          <Fragment key={r}>
            {r > 0 && operator('OR')}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, p: 1, border: 1, borderColor: 'divider', borderRadius: '12px', width: '100%' }}>
              {row.map((term, t) => (
                <Fragment key={t}>
                  {t > 0 && operator('AND')}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: '1 1 150px', minWidth: 0, maxWidth: 240 }}>
                    <TextField
                      size="small"
                      fullWidth
                      value={term}
                      placeholder={r === 0 && t === 0 ? placeholder : undefined}
                      onChange={(e) => update(r, t, e.target.value)}
                      slotProps={{ htmlInput: { 'aria-label': `${label}: linha ${r + 1}, termo ${t + 1}` } }}
                    />
                    {(row.length > 1 || rows.length > 1) && (
                      <IconButton size="small" aria-label={`${label}: remover termo ${t + 1} da linha ${r + 1}`} onClick={() => remove(r, t)}>
                        <Close fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                </Fragment>
              ))}
              <Button size="small" startIcon={<Add />} disabled={full} onClick={() => addAnd(r)} aria-label={`${label}: adicionar termo (AND) à linha ${r + 1}`}>
                AND
              </Button>
            </Box>
          </Fragment>
        ))}
        <Button size="small" variant="outlined" startIcon={<Add />} disabled={full} onClick={() => onChange([...rows, ['']])} aria-label={`${label}: adicionar linha (OR)`}>
          OR
        </Button>
      </Box>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <Typography variant="body2" color="text.secondary">
          Busca no LinkedIn:
        </Typography>
        <Typography variant="body2" component="code" sx={{ fontFamily: 'monospace', wordBreak: 'break-word', flex: '1 1 240px' }}>
          {query || '—'}
        </Typography>
        <Typography variant="caption" color={full ? 'warning.main' : 'text.secondary'} sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {termCount(rows)}/{MAX_TERMS} termos
        </Typography>
        <Typography variant="caption" color={query.length > MAX_QUERY ? 'error' : 'text.secondary'} sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {query.length}/{MAX_QUERY} caracteres
        </Typography>
      </Box>
    </Box>
  )
}
