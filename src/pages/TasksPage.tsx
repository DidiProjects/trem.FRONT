import { useState } from 'react'
import { Link as RouterLink } from 'react-router'
import { Box, Button, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import TaskAltOutlined from '@mui/icons-material/TaskAltOutlined'
import { PageHeader } from '@/components/PageHeader'
import { groupVars } from '@/products/groupVars'
import { groupById } from '@/products/registry'
import { cancelUpload } from '@/products/tasks/runner'
import { STATUS_LABEL, isActive, taskStore, useTasks, type Task } from '@/products/tasks/store'
import { TaskProgress } from '@/products/tasks/TaskProgress'
import { MEDIA } from '@/products/media/paths'

type Filter = 'all' | 'active' | 'done' | 'failed'

const FILTERS: { value: Filter; label: string; test: (t: Task) => boolean }[] = [
  { value: 'all', label: 'Todas', test: () => true },
  { value: 'active', label: 'Em andamento', test: isActive },
  { value: 'done', label: 'Prontas', test: (t) => t.status === 'done' },
  { value: 'failed', label: 'Com erro', test: (t) => t.status === 'failed' },
]

export function TasksPage() {
  const tasks = useTasks()
  const [filter, setFilter] = useState<Filter>('all')
  const media = groupById('media')
  const shown = tasks.filter(FILTERS.find((f) => f.value === filter)!.test)

  return (
    <>
      <PageHeader
        title="Tarefas"
        subtitle="O que roda em segundo plano depois do envio. Pode trocar de página: continua. Ficam guardadas neste navegador."
        actions={
          <ToggleButtonGroup exclusive size="small" value={filter} onChange={(_, v: Filter | null) => v && setFilter(v)} aria-label="Filtrar tarefas">
            {FILTERS.map((f) => (
              <ToggleButton key={f.value} value={f.value} sx={{ px: 1.5 }}>
                {f.label} ({tasks.filter(f.test).length})
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        }
      />

      {shown.length === 0 ? (
        <Stack spacing={1.5} sx={{ alignItems: 'center', textAlign: 'center', py: 8, color: 'text.secondary' }}>
          <TaskAltOutlined sx={{ fontSize: 48 }} aria-hidden />
          <Typography variant="h2" component="p" color="text.primary">
            {tasks.length ? 'Nada com esse filtro' : 'Nenhuma tarefa ainda'}
          </Typography>
          {!tasks.length && (
            <Button component={RouterLink} to={MEDIA.transcribe} variant="contained">
              Transcrever um áudio ou vídeo
            </Button>
          )}
        </Stack>
      ) : (
        <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gap: 1.25 }}>
          {shown.map((task) => (
            <Box
              component="li"
              key={task.id}
              sx={[groupVars(media), { bgcolor: 'background.paper', borderRadius: '18px', p: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }]}
            >
              <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 800, color: 'var(--group)' }}>
                  {media.label} › Transcrever · {STATUS_LABEL[task.status]}
                </Typography>
                <Typography sx={{ fontWeight: 800, overflowWrap: 'anywhere' }}>{task.fileName}</Typography>
                <TaskProgress task={task} />
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {task.status === 'uploading' ? (
                  <Button color="error" onClick={() => cancelUpload(task.id)}>
                    Cancelar
                  </Button>
                ) : (
                  <Button component={RouterLink} to={`${MEDIA.transcribe}?tarefa=${task.id}`} variant={task.status === 'done' ? 'contained' : 'outlined'}>
                    {task.status === 'done' ? 'Abrir resultado' : 'Acompanhar'}
                  </Button>
                )}
                {!isActive(task) && (
                  <Button onClick={() => taskStore.remove(task.id)} aria-label={`Remover ${task.fileName} da lista`}>
                    Remover
                  </Button>
                )}
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </>
  )
}
