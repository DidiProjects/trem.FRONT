import { useEffect, useMemo, useRef, useState, type SyntheticEvent } from 'react'
import { Alert, Box, Button, TextField, Typography } from '@mui/material'
import { FileTool } from '@/products/FileTool'
import { REQUEST_MAX } from '@/services/filesApi'
import { mediaApi, mediaKind } from '@/services/mediaApi'
import { clock, parseClock } from './transcript'
import { MEDIA, MEDIA_ACCEPT } from './paths'

function Player({ file, onTime }: { file: File; onTime: (seconds: number) => void }) {
  const url = useMemo(() => URL.createObjectURL(file), [file])
  useEffect(() => () => URL.revokeObjectURL(url), [url])
  const props = { src: url, controls: true, onTimeUpdate: (e: SyntheticEvent<HTMLMediaElement>) => onTime(e.currentTarget.currentTime) }
  return mediaKind(file) === 'video' ? (
    <Box component="video" {...props} aria-label={`Prévia de ${file.name}`} sx={{ width: '100%', borderRadius: '16px', bgcolor: '#000', maxHeight: 320 }} />
  ) : (
    <Box component="audio" {...props} aria-label={`Prévia de ${file.name}`} sx={{ width: '100%' }} />
  )
}

export default function CutPage() {
  const [start, setStart] = useState('00:00')
  const [end, setEnd] = useState('')
  const now = useRef(0)
  const from = parseClock(start)
  const to = parseClock(end)
  const invalid = from === null || to === null || to <= from

  return (
    <FileTool
      accept={MEDIA_ACCEPT}
      maxBytes={REQUEST_MAX}
      dropTitle="Solte o vídeo ou áudio aqui"
      dropHint="Até 100 MB, o limite do túnel do servidor. Vídeo sai em MP4; áudio mantém o formato."
      options={([file]) => (
        <>
          <Player file={file} onTime={(t) => (now.current = t)} />
          <Typography variant="body2" color="text.secondary">
            Toque até o ponto e use “agora” para marcar, ou digite o tempo (minutos:segundos).
          </Typography>
          {(['start', 'end'] as const).map((which) => (
            <Box key={which} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
              <TextField
                label={which === 'start' ? 'Início' : 'Fim'}
                value={which === 'start' ? start : end}
                placeholder="mm:ss"
                onChange={(e) => (which === 'start' ? setStart : setEnd)(e.target.value)}
                error={(which === 'start' ? start : end) !== '' && parseClock(which === 'start' ? start : end) === null}
                slotProps={{ htmlInput: { inputMode: 'numeric', autoComplete: 'off' } }}
              />
              <Button variant="outlined" sx={{ minHeight: 56, flexShrink: 0 }} onClick={() => (which === 'start' ? setStart : setEnd)(clock(now.current))}>
                {which === 'start' ? 'Início agora' : 'Fim agora'}
              </Button>
            </Box>
          ))}
          {!invalid && <Alert severity="info">Trecho de {clock(to! - from!)}, de {clock(from!)} a {clock(to!)}.</Alert>}
        </>
      )}
      blocker={() => (from === null || to === null ? 'Marque o início e o fim.' : to <= from ? 'O fim precisa vir depois do início.' : null)}
      runLabel={() => 'Cortar trecho'}
      run={async ([file]) => ({ file: await mediaApi.cut(file, from!, to!) })}
      chain={[MEDIA.transcribe]}
      onReset={() => {
        setStart('00:00')
        setEnd('')
      }}
    />
  )
}
