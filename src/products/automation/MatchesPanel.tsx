import { useEffect, useState } from 'react'
import { Alert, Box, CircularProgress, FormControlLabel, Link, Switch, Typography } from '@mui/material'
import { linkedinApi, safeLinkedinUrl, type Match, type ScraperJob } from '@/services/linkedinApi'
import { visuallyHidden } from '@/utils/a11y'

function when(iso?: string | null) {
  return iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : ''
}

type State = { state: 'loading' } | { state: 'error'; message: string } | { state: 'ready'; items: Match[] }

/** What the analysis found for one search, best first. */
export function MatchesPanel({ job }: { job: ScraperJob }) {
  const [onlyRelevant, setOnlyRelevant] = useState(true)
  const [result, setResult] = useState<{ key: string; value: State } | null>(null)
  const key = `${job.id}:${onlyRelevant}`
  const shown: State = result?.key === key ? result.value : { state: 'loading' }

  useEffect(() => {
    let active = true
    linkedinApi.matches(job.id, onlyRelevant ? job.config.analysis.min_score : 0).then(
      (items) => active && setResult({ key, value: { state: 'ready', items: [...items].sort((a, b) => b.score - a.score) } }),
      (e: Error) => active && setResult({ key, value: { state: 'error', message: e.message } }),
    )
    return () => {
      active = false
    }
  }, [job.id, job.config.analysis.min_score, onlyRelevant, key])

  return (
    <Box component="section" aria-label={`Vagas de ${job.config.name}`} sx={{ bgcolor: 'background.paper', borderRadius: '20px', p: { xs: 2, sm: 2.5 }, display: 'grid', gap: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="h2" sx={{ flexGrow: 1 }}>
          Vagas de “{job.config.name}”
        </Typography>
        <FormControlLabel
          control={<Switch checked={onlyRelevant} onChange={(e) => setOnlyRelevant(e.target.checked)} />}
          label={`Só nota ${job.config.analysis.min_score}+`}
        />
      </Box>

      {shown.state === 'loading' && <CircularProgress aria-label="Carregando vagas" sx={{ justifySelf: 'center' }} />}
      {shown.state === 'error' && <Alert severity="error">{shown.message}</Alert>}
      {shown.state === 'ready' && shown.items.length === 0 && (
        <Typography color="text.secondary">Nada por aqui ainda. As vagas aparecem depois da próxima rodada.</Typography>
      )}
      {shown.state === 'ready' && shown.items.length > 0 && (
        <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gap: 1 }}>
          {shown.items.map((m, i) => {
            const url = safeLinkedinUrl(m.url)
            const title = m.title || `Post de ${m.author || 'alguém'}`
            const where = [m.company, m.location].filter(Boolean).join(' · ')
            return (
              <Box component="li" key={`${m.url}-${i}`} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', bgcolor: 'background.default', borderRadius: '14px', p: 1.5 }}>
                <Box
                  aria-label={`Nota ${m.score} de 100`}
                  role="img"
                  sx={{
                    flexShrink: 0,
                    width: 48,
                    height: 48,
                    borderRadius: '12px',
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 800,
                    bgcolor: m.relevant ? 'var(--group)' : 'action.selected',
                    color: m.relevant ? 'var(--on-group)' : 'text.primary',
                  }}
                >
                  {m.score}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  {url ? (
                    <Link href={url} target="_blank" rel="noopener noreferrer" sx={{ fontWeight: 800, overflowWrap: 'anywhere' }}>
                      {title}
                      <Box component="span" sx={visuallyHidden}>
                        (abre o LinkedIn em nova aba)
                      </Box>
                    </Link>
                  ) : (
                    <Typography sx={{ fontWeight: 800, overflowWrap: 'anywhere' }}>{title}</Typography>
                  )}
                  {where && (
                    <Typography variant="body2" color="text.secondary">
                      {where}
                    </Typography>
                  )}
                  {m.reason && <Typography variant="body2">{m.reason}</Typography>}
                  <Typography variant="body2" color="text.secondary">
                    {when(m.analyzed_at)}
                    {m.notified_at ? ' · enviada por e-mail' : ''}
                  </Typography>
                </Box>
              </Box>
            )
          })}
        </Box>
      )}
    </Box>
  )
}
