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

// LinkedIn post search stops reading an expression after 6 terms, whatever their length
// (measured 2026-11-22); linkedinho refuses more. Words and quoted phrases count, operators do not.
const MAX_POST_TERMS = 6
const postTerms = (line: string) =>
  line.replace(/"[^"]*"/g, ' PHRASE ').replace(/[()]/g, ' ').replace(/\b(AND|OR|NOT)\b/g, ' ').split(/\s+/).filter(Boolean).length

interface Values {
  name: string
  jobKeywords: string
  locations: string
  postKeywords: string
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
    jobKeywords: c?.jobs.keywords.join('\n') ?? '',
    locations: c?.jobs.locations.join('\n') ?? '',
    postKeywords: c?.posts.keywords.join('\n') ?? '',
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

function toConfig(v: Values): JobConfig {
  return {
    name: v.name.trim(),
    jobs: { keywords: lines(v.jobKeywords), locations: lines(v.locations), max_pages: Number(v.maxPages) },
    posts: { keywords: lines(v.postKeywords), max_scrolls: Number(v.maxScrolls) },
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
  const missing = !v.name.trim()
    ? 'Dê um nome à busca.'
    : !lines(v.jobKeywords).length && !lines(v.postKeywords).length
      ? 'Informe ao menos um termo de vaga ou de post.'
      : lines(v.postKeywords).some((l) => postTerms(l) > MAX_POST_TERMS)
        ? `Cada linha de posts lê no máximo ${MAX_POST_TERMS} termos no LinkedIn.`
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
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { sm: '1fr 1fr' } }}>
            {field('jobKeywords', 'Termos de vagas', {
              multiline: true,
              minRows: 3,
              helperText: 'Um por linha, cada um é uma busca, ex.: react developer. A busca de vagas do LinkedIn é por IA e ignora AND/OR.',
            })}
            {field('locations', 'Locais', {
              multiline: true,
              minRows: 3,
              helperText: 'Um por linha, nome completo, ex.: United Kingdom (UK vira Ucrânia).',
            })}
          </Box>
          {field('postKeywords', 'Termos de posts', {
            multiline: true,
            minRows: 2,
            helperText: `Posts de recrutadores. Um por linha, cada um é uma busca. Na mesma linha valem AND, OR, NOT e aspas, até ${MAX_POST_TERMS} termos, ex.: ("front end" OR react) AND hiring AND London`,
          })}
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
