import { useState } from 'react'
import { Link as RouterLink, useSearchParams } from 'react-router'
import { Alert, Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { FileDrop } from '@/components/FileDrop'
import { handoff } from '@/products/handoff'
import { ToolLayout } from '@/products/ToolLayout'
import { cancelUpload, startTranscription } from '@/products/tasks/runner'
import { taskStore, useTask, useTasks } from '@/products/tasks/store'
import { TaskProgress } from '@/products/tasks/TaskProgress'
import { useTool } from '@/products/toolContext'
import { formatBytes } from '@/utils/text'
import { MEDIA_ACCEPT } from './paths'
import { TranscriptView } from './TranscriptView'

const LANGUAGES = [
  { value: '', label: 'Detectar sozinho' },
  { value: 'pt', label: 'Português' },
  { value: 'en', label: 'Inglês' },
  { value: 'es', label: 'Espanhol' },
]

const panelSx = { bgcolor: 'background.paper', borderRadius: '20px', p: { xs: 2, sm: 2.5 } }

function NewTranscription({ onStart }: { onStart: (id: string) => void }) {
  const { tool } = useTool()
  const [file, setFile] = useState<File | null>(() => handoff.take(tool.path)[0] ?? null)
  const [language, setLanguage] = useState('')

  if (!file) {
    return (
      <FileDrop
        accept={MEDIA_ACCEPT}
        onFiles={([f]) => setFile(f)}
        title="Solte o áudio ou vídeo aqui"
        hint="MP3, M4A, WAV, MP4, MKV… Arquivos grandes vão em partes; se a conexão cair no meio, o envio tenta de novo."
      />
    )
  }
  return (
    <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <Box sx={{ ...panelSx, flex: '999 1 420px', minWidth: 0 }}>
        <Typography sx={{ fontWeight: 800, overflowWrap: 'anywhere' }}>{file.name}</Typography>
        <Typography variant="body2" color="text.secondary">
          {formatBytes(file.size)}
        </Typography>
      </Box>
      <Box component="aside" aria-label="Opções" sx={{ ...panelSx, flex: '1 1 280px', display: 'grid', gap: 2 }}>
        <TextField select label="Idioma da fala" value={language} onChange={(e) => setLanguage(e.target.value)}>
          {LANGUAGES.map((l) => (
            <MenuItem key={l.value} value={l.value}>
              {l.label}
            </MenuItem>
          ))}
        </TextField>
        <Typography variant="body2" color="text.secondary">
          Depois do envio você pode sair da página: a transcrição continua e aparece em Tarefas.
        </Typography>
        <Button variant="contained" size="large" onClick={() => onStart(startTranscription(file, language || null))} sx={{ bgcolor: 'var(--group)', color: 'var(--on-group)' }}>
          Transcrever
        </Button>
        <Button onClick={() => setFile(null)}>Trocar arquivo</Button>
      </Box>
    </Box>
  )
}

function TaskView({ id, onNew }: { id: string; onNew: () => void }) {
  const task = useTask(id)
  if (!task) {
    return (
      <Alert severity="info" action={<Button onClick={onNew}>Nova transcrição</Button>}>
        Essa transcrição não está mais neste navegador.
      </Alert>
    )
  }
  if (task.status === 'done' && task.result) {
    return (
      <Stack spacing={2}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Typography role="status" variant="h2" sx={{ flexGrow: 1, overflowWrap: 'anywhere' }}>
            {task.fileName}
          </Typography>
          <Button onClick={onNew}>Nova transcrição</Button>
        </Box>
        <TranscriptView transcript={task.result} fileName={task.fileName} />
      </Stack>
    )
  }
  return (
    <Box sx={{ ...panelSx, display: 'grid', gap: 2 }} aria-live="polite">
      <Typography variant="h2" sx={{ overflowWrap: 'anywhere' }}>
        {task.fileName}
      </Typography>
      <TaskProgress task={task} />
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {task.status === 'uploading' && (
          <Button color="error" onClick={() => cancelUpload(task.id)}>
            Cancelar envio
          </Button>
        )}
        {(task.status === 'queued' || task.status === 'running') && (
          <Button component={RouterLink} to="/tarefas" variant="outlined">
            Ir para Tarefas
          </Button>
        )}
        {task.status === 'failed' && (
          <>
            <Button variant="contained" onClick={onNew}>
              Enviar de novo
            </Button>
            <Button onClick={() => taskStore.remove(task.id)}>Remover da lista</Button>
          </>
        )}
      </Box>
    </Box>
  )
}

export default function TranscribePage() {
  const { group, tool } = useTool()
  const [params, setParams] = useSearchParams()
  const current = params.get('tarefa')
  const others = useTasks().filter((t) => t.kind === 'transcription' && t.id !== current)

  return (
    <ToolLayout group={group} tool={tool}>
      <Stack spacing={4}>
        {current ? <TaskView id={current} onNew={() => setParams({})} /> : <NewTranscription onStart={(id) => setParams({ tarefa: id })} />}
        {others.length > 0 && (
          <Box component="section" aria-labelledby="past-transcriptions">
            <Typography id="past-transcriptions" variant="h2" sx={{ mb: 1.5 }}>
              Suas transcrições
            </Typography>
            <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gap: 1 }}>
              {others.map((t) => (
                <Box component="li" key={t.id} sx={{ ...panelSx, py: 1.5 }}>
                  <Box component={RouterLink} to={`?tarefa=${t.id}`} sx={{ fontWeight: 800, color: 'text.primary', overflowWrap: 'anywhere' }}>
                    {t.fileName}
                  </Box>
                  <TaskProgress task={t} />
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Stack>
    </ToolLayout>
  )
}
