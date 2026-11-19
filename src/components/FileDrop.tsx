import { useId, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { Box, Button, Typography } from '@mui/material'
import FileUploadOutlined from '@mui/icons-material/FileUploadOutlined'

interface Props {
  /** The input's `accept`, e.g. "application/pdf" or "image/*". */
  accept?: string
  multiple?: boolean
  onFiles: (files: File[]) => void
  title: string
  hint?: ReactNode
  buttonLabel?: string
  compact?: boolean
  disabled?: boolean
}

/**
 * Drop area with a real button: dragging is a shortcut, the keyboard and screen-reader
 * path is the "choose" button, which opens the file picker.
 */
export function FileDrop({ accept, multiple, onFiles, title, hint, buttonLabel = 'Escolher arquivo', compact, disabled }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const hintId = useId()
  const [over, setOver] = useState(false)

  const take = (list: FileList | null) => {
    const files = Array.from(list ?? [])
    if (files.length) onFiles(multiple ? files : files.slice(0, 1))
  }

  const onDrop = (event: DragEvent) => {
    event.preventDefault()
    setOver(false)
    if (!disabled) take(event.dataTransfer.files)
  }

  return (
    <Box
      onDragOver={(e) => {
        e.preventDefault()
        if (!disabled) setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      sx={{
        border: 2,
        borderStyle: 'dashed',
        borderColor: over ? 'var(--group, currentColor)' : 'divider',
        bgcolor: over ? 'var(--group-soft, transparent)' : 'transparent',
        borderRadius: '24px',
        px: { xs: 2, sm: 3 },
        py: compact ? 3 : { xs: 5, sm: 8 },
        display: 'flex',
        flexDirection: compact ? { xs: 'column', sm: 'row' } : 'column',
        alignItems: 'center',
        gap: 2,
        textAlign: compact ? { xs: 'center', sm: 'left' } : 'center',
      }}
    >
      <FileUploadOutlined aria-hidden sx={{ fontSize: compact ? 40 : 56, color: 'var(--group, currentColor)' }} />
      <Box sx={{ flexGrow: 1 }}>
        <Typography sx={{ fontWeight: 800, fontSize: compact ? 18 : 22 }}>{title}</Typography>
        {hint && (
          <Typography id={hintId} variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {hint}
          </Typography>
        )}
      </Box>
      <Button
        variant="contained"
        size="large"
        disabled={disabled}
        onClick={() => input.current?.click()}
        aria-describedby={hint ? hintId : undefined}
        sx={{ bgcolor: 'var(--group, var(--mui-palette-primary-main))', color: 'var(--on-group, var(--mui-palette-primary-contrastText))' }}
      >
        {buttonLabel}
      </Button>
      <input
        ref={input}
        type="file"
        hidden
        accept={accept}
        multiple={multiple}
        onChange={(e) => {
          take(e.target.files)
          e.target.value = ''
        }}
      />
    </Box>
  )
}
