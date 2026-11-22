import { useId, useState } from 'react'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  FormLabel,
  MenuItem,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import ExpandMore from '@mui/icons-material/ExpandMore'
import { groupVars } from '@/products/groupVars'
import { groupById } from '@/products/registry'
import { linkedinApi, type Effort, type JobConfig, type ScraperJob, type Weekday } from '@/services/linkedinApi'
import { TermBuilder } from './TermBuilder'
import { fromKeywords, MAX_QUERY, toQuery, type Groups } from './terms'

const DAYS: { value: Weekday; label: string }[] = [
  { value: 'mon', label: 'Seg' },
  { value: 'tue', label: 'Ter' },
  { value: 'wed', label: 'Qua' },
  { value: 'thu', label: 'Qui' },
  { value: 'fri', label: 'Sex' },
  { value: 'sat', label: 'Sáb' },
  { value: 'sun', label: 'Dom' },
]

const lines = (text: string) => text.split('\n').map((s) => s.trim()).filter(Boolean)

interface Values {
  name: string
  jobTerms: Groups
  locations: string
  postTerms: Groups
  criteria: string
  days: Weekday[]
  times: string
  timezone: string
  expires: string
  notify: string
  minScore: string
  maxItems: string
  effort: Effort
  maxPages: string
  maxScrolls: string
}

function initial(job: ScraperJob | null, email: string | null): Values {
  const c = job?.config
  return {
    name: c?.name ?? '',
    jobTerms: fromKeywords(c?.jobs.keywords ?? []),
    locations: c?.jobs.locations.join('\n') ?? '',
    postTerms: fromKeywords(c?.posts.keywords ?? []),
    criteria: c?.analysis.criteria ?? '',
    days: c?.schedule.days ?? ['mon', 'tue', 'wed', 'thu', 'fri'],
    times: c?.schedule.times.join(', ') ?? '07:00, 13:00, 19:00',
    timezone: c?.schedule.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    expires: c?.expires_on ?? '',
    notify: c?.notify_to ?? email ?? '',
    minScore: String(c?.analysis.min_score ?? 70),
    maxItems: String(c?.analysis.max_items ?? 30),
    effort: c?.analysis.effort ?? 'low',
    maxPages: String(c?.jobs.max_pages ?? 2),
    maxScrolls: String(c?.posts.max_scrolls ?? 10),
  }
}

// The builder makes one expression, so one LinkedIn search per location instead of one per term.
const keywords = (groups: Groups) => {
  const query = toQuery(groups)
  return query ? [query] : []
}

function toConfig(v: Values): JobConfig {
  return {
    name: v.name.trim(),
    jobs: { keywords: keywords(v.jobTerms), locations: lines(v.locations), max_pages: Number(v.maxPages) },
    posts: { keywords: keywords(v.postTerms), max_scrolls: Number(v.maxScrolls) },
    analysis: { criteria: v.criteria.trim(), min_score: Number(v.minScore), max_items: Number(v.maxItems), effort: v.effort },
    schedule: { timezone: v.timezone.trim(), days: v.days, times: v.times.split(',').map((s) => s.trim()).filter(Boolean) },
    notify_to: v.notify.trim(),
    expires_on: v.expires || null,
  }
}

interface Props {
  job: ScraperJob | null
  email: string | null
  onClose: () => void
  onSaved: (message: string) => void
}

/** Creates or edits a search; a new one can take the CV right away. */
export function JobFormDialog({ job, email, onClose, onSaved }: Props) {
  const titleId = useId()
  const full = useMediaQuery(useTheme().breakpoints.down('sm'))
  const [v, setV] = useState<Values>(() => initial(job, email))
  const [cv, setCv] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const set = <K extends keyof Values>(key: K) => (value: Values[K]) => setV((prev) => ({ ...prev, [key]: value }))
  const jobQuery = toQuery(v.jobTerms)
  const postQuery = toQuery(v.postTerms)
  const missing = !v.name.trim()
    ? 'Dê um nome à busca.'
    : !jobQuery && !postQuery
      ? 'Informe ao menos um termo de vaga ou de post.'
      : jobQuery.length > MAX_QUERY || postQuery.length > MAX_QUERY
        ? `Cada busca tem no máximo ${MAX_QUERY} caracteres.`
        : !v.days.length
          ? 'Escolha ao menos um dia.'
          : null

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const saved = job ? await linkedinApi.update(job.id, toConfig(v)) : await linkedinApi.create(toConfig(v))
      if (cv) {
        try {
          await linkedinApi.uploadCv(saved.id, cv)
        } catch (e) {
          // The search exists anyway: say so instead of looking like nothing was saved.
          onSaved(`Busca salva, mas o currículo não: ${(e as Error).message}`)
          return
        }
      }
      onSaved(job ? 'Busca atualizada' : 'Busca criada')
    } catch (e) {
      setError((e as Error).message)
      setSaving(false)
    }
  }

  const field = (key: keyof Values, label: string, extra: object = {}) => (
    <TextField label={label} value={v[key]} onChange={(e) => set(key)(e.target.value as never)} {...extra} />
  )

  return (
    <Dialog
      open
      onClose={onClose}
      fullScreen={full}
      fullWidth
      maxWidth="md"
      aria-labelledby={titleId}
      // The dialog renders in a portal, outside the page's GroupScope.
      slotProps={{ paper: { sx: groupVars(groupById('automation')) } }}
    >
      <DialogTitle id={titleId}>{job ? `Editar “${job.config.name}”` : 'Nova busca'}</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 3 }}>
        <Box component="fieldset" sx={{ border: 0, p: 0, m: 0, display: 'grid', gap: 2 }}>
          <Typography component="legend" variant="h2" sx={{ mb: 1 }}>
            O que procurar
          </Typography>
          {field('name', 'Nome da busca', { placeholder: 'Frontend no Reino Unido', required: true, autoFocus: true })}
          <TermBuilder
            label="Termos de vagas"
            helper="O que a vaga precisa ter."
            placeholder="react"
            groups={v.jobTerms}
            onChange={set('jobTerms')}
          />
          {field('locations', 'Locais', {
            multiline: true,
            minRows: 2,
            helperText: 'Um por linha, nome completo: United Kingdom (UK vira Ucrânia). Cada local é uma busca.',
          })}
          <TermBuilder
            label="Termos de posts"
            helper="Posts de recrutadores. A busca de posts não filtra local: ponha o local como um grupo."
            placeholder="hiring"
            groups={v.postTerms}
            onChange={set('postTerms')}
          />
          {field('criteria', 'O que você procura, em poucas frases', {
            multiline: true,
            minRows: 3,
            helperText: 'A IA usa isso junto com o currículo para dar a nota de cada vaga.',
          })}
        </Box>

        <Box component="fieldset" sx={{ border: 0, p: 0, m: 0, display: 'grid', gap: 2 }}>
          <Typography component="legend" variant="h2" sx={{ mb: 1 }}>
            Quando rodar
          </Typography>
          <Box>
            <FormLabel component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
              Dias
            </FormLabel>
            <FormGroup row>
              {DAYS.map((d) => (
                <FormControlLabel
                  key={d.value}
                  label={d.label}
                  control={
                    <Checkbox
                      checked={v.days.includes(d.value)}
                      onChange={(e) => set('days')(e.target.checked ? [...v.days, d.value] : v.days.filter((x) => x !== d.value))}
                    />
                  }
                />
              ))}
            </FormGroup>
          </Box>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { sm: '1fr 1fr 1fr' } }}>
            {field('times', 'Horários', { helperText: 'Separados por vírgula, 1 h de intervalo no mínimo' })}
            {field('timezone', 'Fuso horário')}
            {field('expires', 'Roda até', { type: 'date', helperText: 'Em branco: sem data para acabar', slotProps: { inputLabel: { shrink: true } } })}
          </Box>
        </Box>

        <Box component="fieldset" sx={{ border: 0, p: 0, m: 0, display: 'grid', gap: 2 }}>
          <Typography component="legend" variant="h2" sx={{ mb: 1 }}>
            Aviso e currículo
          </Typography>
          {field('notify', 'Mandar as vagas que combinam para', { type: 'email', autoComplete: 'email' })}
          {!job && (
            <Box>
              <Button variant="outlined" component="label">
                {cv ? `Currículo: ${cv.name}` : 'Escolher currículo (.docx)'}
                <input hidden type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(e) => setCv(e.target.files?.[0] ?? null)} />
              </Button>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Sem currículo a busca fica esperando. Dá para enviar depois.
              </Typography>
            </Box>
          )}
        </Box>

        <Accordion disableGutters elevation={0} sx={{ bgcolor: 'action.hover', borderRadius: '16px !important', '&:before': { display: 'none' } }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography sx={{ fontWeight: 700 }}>Ajustes avançados</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ display: 'grid', gap: 2, gridTemplateColumns: { sm: '1fr 1fr' } }}>
            {field('minScore', 'Nota mínima para mandar e-mail (0 a 100)', { type: 'number', slotProps: { htmlInput: { min: 0, max: 100 } } })}
            {field('maxItems', 'Itens analisados por rodada', { type: 'number', slotProps: { htmlInput: { min: 1 } } })}
            {field('maxPages', 'Páginas de vagas por busca', { type: 'number', slotProps: { htmlInput: { min: 1 } } })}
            {field('maxScrolls', 'Rolagens no feed de posts', { type: 'number', slotProps: { htmlInput: { min: 0 } } })}
            <TextField select label="Esforço da IA" value={v.effort} onChange={(e) => set('effort')(e.target.value as Effort)}>
              <MenuItem value="low">Baixo, mais rápido</MenuItem>
              <MenuItem value="medium">Médio</MenuItem>
              <MenuItem value="high">Alto, mais cuidadoso</MenuItem>
            </TextField>
          </AccordionDetails>
        </Accordion>

        {error && (
          <Alert severity="error" role="alert">
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, flexWrap: 'wrap', gap: 1 }}>
        {missing && (
          <Typography variant="body2" color="text.secondary" sx={{ mr: 'auto' }}>
            {missing}
          </Typography>
        )}
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={save} disabled={Boolean(missing) || saving} sx={{ bgcolor: 'var(--group)', color: 'var(--on-group)' }}>
          {job ? 'Salvar' : 'Criar busca'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
