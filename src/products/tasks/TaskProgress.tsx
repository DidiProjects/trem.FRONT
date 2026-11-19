import { Box, LinearProgress, Typography } from '@mui/material'
import { STATUS_LABEL, type Task } from './store'

/** One line of what a task is doing, with a bar while it runs. */
export function TaskProgress({ task }: { task: Task }) {
  const text =
    task.status === 'uploading'
      ? `Enviando… ${Math.round((task.progress ?? 0) * 100)}%`
      : task.status === 'queued'
        ? 'Na fila do servidor: começa assim que a anterior terminar.'
        : task.status === 'running'
          ? 'Transcrevendo. Uma hora de áudio leva alguns minutos.'
          : task.status === 'failed'
            ? (task.error ?? 'Falhou.')
            : `Pronta${task.finishedAt ? ` às ${new Date(task.finishedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}.`
  const busy = task.status === 'uploading' || task.status === 'queued' || task.status === 'running'

  return (
    <Box>
      <Typography variant="body2" color={task.status === 'failed' ? 'error' : 'text.secondary'}>
        {text}
      </Typography>
      {busy && (
        <LinearProgress
          aria-label={`${STATUS_LABEL[task.status]}: ${task.fileName}`}
          variant={task.status === 'uploading' ? 'determinate' : 'indeterminate'}
          value={Math.round((task.progress ?? 0) * 100)}
          sx={{ mt: 1, borderRadius: '999px', maxWidth: 480, '& .MuiLinearProgress-bar': { bgcolor: 'var(--group, currentColor)' } }}
        />
      )}
    </Box>
  )
}
