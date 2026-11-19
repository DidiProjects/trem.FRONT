import { useState, type ReactNode } from 'react'
import { Link as RouterLink } from 'react-router'
import { Alert, Box, Button, IconButton, LinearProgress, Stack, Typography } from '@mui/material'
import ArrowUpward from '@mui/icons-material/ArrowUpward'
import ArrowDownward from '@mui/icons-material/ArrowDownward'
import Close from '@mui/icons-material/Close'
import CheckCircle from '@mui/icons-material/CheckCircle'
import Download from '@mui/icons-material/Download'
import InsertDriveFileOutlined from '@mui/icons-material/InsertDriveFileOutlined'
import { FileDrop } from '@/components/FileDrop'
import type { FileResult } from '@/services/filesApi'
import { visuallyHidden } from '@/utils/a11y'
import { saveBlob } from '@/utils/download'
import { formatBytes } from '@/utils/text'
import { handoff } from './handoff'
import { locate } from './registry'
import { ToolLayout } from './ToolLayout'
import { useTool } from './toolContext'

export type Outcome = { file: FileResult; detail?: string; preview?: ReactNode } | { view: ReactNode; title?: string }

interface Props {
  accept: string
  multiple?: boolean
  /** Per file, checked before anything is sent. */
  maxBytes: number
  dropTitle: string
  dropHint?: ReactNode
  /** Side panel with the tool's options, next to the files. */
  options?: ReactNode | ((files: File[]) => ReactNode)
  /** Why the action cannot run yet, shown under the button; null when it can. */
  blocker?: (files: File[]) => string | null
  runLabel: (files: File[]) => string
  run: (files: File[]) => Promise<Outcome>
  /** Tools the produced file can go to next, by route. */
  chain?: string[]
  /**
   * Keeps the files and options on screen after a run, with the result below, so the
   * options can be changed and the tool run again (compressing an image, for one).
   */
  inline?: boolean
  onReset?: () => void
}

type Phase = { kind: 'edit' } | { kind: 'running' } | { kind: 'done'; outcome: Outcome } | { kind: 'error'; message: string }

const panelSx = { bgcolor: 'background.paper', borderRadius: '20px', p: { xs: 2, sm: 2.5 } }

export function FileTool(props: Props) {
  const { accept, multiple, maxBytes, dropTitle, dropHint, options, blocker, runLabel, run, chain, inline, onReset } = props
  const { group, tool } = useTool()
  const [files, setFiles] = useState<File[]>(() => handoff.take(tool.path))
  const [phase, setPhase] = useState<Phase>({ kind: 'edit' })
  const [announce, setAnnounce] = useState('')
  const [rejected, setRejected] = useState<string | null>(null)

  const add = (incoming: File[]) => {
    const tooBig = incoming.filter((f) => f.size > maxBytes)
    const ok = incoming.filter((f) => f.size <= maxBytes)
    setRejected(tooBig.length ? `${tooBig.map((f) => f.name).join(', ')}: acima de ${formatBytes(maxBytes)}, o limite desta ferramenta.` : null)
    setFiles((prev) => (multiple ? [...prev, ...ok] : ok.slice(0, 1)))
    setPhase({ kind: 'edit' })
  }

  const move = (index: number, offset: number) => {
    const next = [...files]
    const [item] = next.splice(index, 1)
    next.splice(index + offset, 0, item)
    setFiles(next)
    setAnnounce(`${item.name} agora é o ${index + offset + 1}º de ${next.length}.`)
  }

  const remove = (index: number) => {
    setAnnounce(`${files[index].name} removido.`)
    setFiles(files.filter((_, i) => i !== index))
  }

  const reset = () => {
    setFiles([])
    setPhase({ kind: 'edit' })
    setRejected(null)
    onReset?.()
  }

  const start = async () => {
    setPhase({ kind: 'running' })
    try {
      setPhase({ kind: 'done', outcome: await run(files) })
    } catch (error) {
      setPhase({ kind: 'error', message: error instanceof Error ? error.message : 'Algo deu errado. Tente de novo.' })
    }
  }

  const reason = blocker?.(files) ?? null
  const running = phase.kind === 'running'

  return (
    <ToolLayout group={group} tool={tool}>
      <Box role="status" aria-live="polite" sx={visuallyHidden}>
        {announce}
      </Box>

      {phase.kind === 'done' && !inline ? (
        <Result outcome={phase.outcome} chain={chain} onReset={reset} />
      ) : files.length === 0 ? (
        <Stack spacing={2}>
          <FileDrop accept={accept} multiple={multiple} onFiles={add} title={dropTitle} hint={dropHint} buttonLabel={multiple ? 'Escolher arquivos' : 'Escolher arquivo'} />
          {rejected && <Alert severity="warning">{rejected}</Alert>}
        </Stack>
      ) : (
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'flex-start' }} aria-busy={running}>
          <Box component="section" aria-label="Arquivos" sx={{ flex: '999 1 420px', minWidth: 0, display: 'grid', gap: 1 }}>
            {multiple && files.length > 1 && (
              <Typography variant="body2" color="text.secondary">
                A ordem da lista é a ordem do resultado. Use as setas para mudar.
              </Typography>
            )}
            <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gap: 1 }}>
              {files.map((file, index) => (
                <Box component="li" key={`${file.name}-${index}`} sx={{ ...panelSx, py: 1.25, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <InsertDriveFileOutlined aria-hidden sx={{ color: 'var(--group)' }} />
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>{file.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formatBytes(file.size)}
                    </Typography>
                  </Box>
                  {multiple && (
                    <>
                      <IconButton aria-label={`Mover ${file.name} para cima`} disabled={index === 0 || running} onClick={() => move(index, -1)}>
                        <ArrowUpward />
                      </IconButton>
                      <IconButton
                        aria-label={`Mover ${file.name} para baixo`}
                        disabled={index === files.length - 1 || running}
                        onClick={() => move(index, 1)}
                      >
                        <ArrowDownward />
                      </IconButton>
                    </>
                  )}
                  <IconButton aria-label={`Remover ${file.name}`} disabled={running} onClick={() => remove(index)}>
                    <Close />
                  </IconButton>
                </Box>
              ))}
            </Box>
            {multiple && (
              <FileDrop compact accept={accept} multiple onFiles={add} title="Adicionar mais" buttonLabel="Adicionar arquivos" disabled={running} />
            )}
            {rejected && <Alert severity="warning">{rejected}</Alert>}
          </Box>

          <Box component="aside" aria-label="Opções" sx={{ ...panelSx, flex: '1 1 280px', display: 'grid', gap: 2 }}>
            {typeof options === 'function' ? options(files) : options}
            {phase.kind === 'error' && (
              <Alert severity="error" role="alert">
                {phase.message}
              </Alert>
            )}
            {running && (
              <Box role="status">
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Processando no servidor…
                </Typography>
                <LinearProgress aria-label="Processando" sx={{ '& .MuiLinearProgress-bar': { bgcolor: 'var(--group)' } }} />
              </Box>
            )}
            <Button
              variant="contained"
              size="large"
              disabled={Boolean(reason) || running}
              onClick={start}
              sx={{ bgcolor: 'var(--group)', color: 'var(--on-group)' }}
            >
              {runLabel(files)}
            </Button>
            {reason && (
              <Typography variant="body2" color="text.secondary">
                {reason}
              </Typography>
            )}
            {!multiple && (
              <Button variant="text" onClick={reset} disabled={running}>
                Trocar arquivo
              </Button>
            )}
          </Box>
        </Box>
      )}

      {phase.kind === 'done' && inline && (
        <Box sx={{ mt: 3 }}>
          <Result outcome={phase.outcome} chain={chain} onReset={reset} />
        </Box>
      )}
    </ToolLayout>
  )
}

function Result({ outcome, chain, onReset }: { outcome: Outcome; chain?: string[]; onReset: () => void }) {
  const next = 'file' in outcome ? (chain ?? []).map((path) => locate(path).tool).filter((t) => t !== undefined) : []
  return (
    <Stack spacing={3}>
      {'file' in outcome ? (
        <Box role="status" sx={{ ...panelSx, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <CheckCircle aria-hidden sx={{ fontSize: 48, color: 'var(--group)' }} />
          <Box sx={{ flex: '1 1 240px', minWidth: 0 }}>
            <Typography sx={{ fontWeight: 800, fontSize: 20, overflowWrap: 'anywhere' }}>Pronto: {outcome.file.name}</Typography>
            <Typography color="text.secondary">{outcome.detail ?? formatBytes(outcome.file.blob.size)}</Typography>
          </Box>
          <Button
            variant="contained"
            size="large"
            startIcon={<Download />}
            onClick={() => saveBlob(outcome.file.blob, outcome.file.name)}
            sx={{ bgcolor: 'var(--group)', color: 'var(--on-group)' }}
          >
            Baixar
          </Button>
        </Box>
      ) : null}
      {'file' in outcome ? (
        outcome.preview
      ) : (
        <Box>
          {outcome.title && (
            <Typography role="status" variant="h2" sx={{ mb: 2 }}>
              {outcome.title}
            </Typography>
          )}
          {outcome.view}
        </Box>
      )}

      {next.length > 0 && 'file' in outcome && (
        <Box component="section" aria-labelledby="chain-title">
          <Typography id="chain-title" sx={{ fontWeight: 800, mb: 1 }}>
            Continuar com este arquivo
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {next.map((tool) => (
              <Button
                key={tool.path}
                component={RouterLink}
                to={tool.path}
                variant="outlined"
                onClick={() => handoff.give(tool.path, [new File([outcome.file.blob], outcome.file.name, { type: outcome.file.blob.type })])}
                sx={{ borderColor: 'var(--group)', color: 'text.primary' }}
              >
                {tool.label}
              </Button>
            ))}
          </Box>
        </Box>
      )}

      <Box>
        <Button onClick={onReset}>Começar de novo</Button>
      </Box>
    </Stack>
  )
}
