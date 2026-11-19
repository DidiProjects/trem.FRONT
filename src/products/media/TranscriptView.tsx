import { useState } from 'react'
import { Link as RouterLink } from 'react-router'
import { Box, Button, InputAdornment, TextField, Typography } from '@mui/material'
import ContentCopy from '@mui/icons-material/ContentCopy'
import Download from '@mui/icons-material/Download'
import SearchOutlined from '@mui/icons-material/SearchOutlined'
import { useSnackbar } from 'notistack'
import { useAuth } from '@/hooks/useAuth'
import { CHAT_PATH } from '@/products/ai'
import { handoff } from '@/products/handoff'
import { AI } from '@/products/registry'
import { baseName } from '@/services/filesApi'
import type { Transcript } from '@/services/mediaApi'
import { saveBlob } from '@/utils/download'
import { fold } from '@/utils/text'
import { clock, toSrt, toText, toVtt } from './transcript'


export function TranscriptView({ transcript, fileName }: { transcript: Transcript; fileName: string }) {
  const { user } = useAuth()
  const { enqueueSnackbar } = useSnackbar()
  const [query, setQuery] = useState('')
  const needle = fold(query.trim())
  const segments = transcript.segments
  const hits = needle ? segments.filter((s) => fold(s.text).includes(needle)).length : 0
  const base = baseName(fileName)

  const save = (content: string, ext: string, type: string) => saveBlob(new Blob([content], { type: `${type};charset=utf-8` }), `${base}.${ext}`)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(transcript.text)
      enqueueSnackbar('Texto copiado')
    } catch {
      enqueueSnackbar('Não foi possível copiar. Selecione o texto e copie.', { variant: 'error' })
    }
  }

  const toChat = () => handoff.give(CHAT_PATH, [new File([toText(segments)], `${base}.txt`, { type: 'text/plain' })])

  return (
    <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <Box component="section" aria-label="Transcrição" sx={{ flex: '999 1 480px', minWidth: 0, bgcolor: 'background.paper', borderRadius: '20px', p: 1 }}>
        <Box sx={{ p: 1.5, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            size="small"
            label="Buscar no texto"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            sx={{ flex: '1 1 220px' }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchOutlined fontSize="small" /></InputAdornment> } }}
          />
          <Typography role="status" variant="body2" color="text.secondary">
            {needle ? `${hits} ${hits === 1 ? 'trecho encontrado' : 'trechos encontrados'}` : `${segments.length} trechos${transcript.duration ? ` · ${clock(transcript.duration)}` : ''}`}
          </Typography>
        </Box>
        <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0 }}>
          {segments.map((seg, i) => {
            const hit = needle && fold(seg.text).includes(needle)
            return (
              <Box
                component="li"
                key={i}
                sx={{ display: 'grid', gridTemplateColumns: '64px 1fr', gap: 1.5, px: 1.5, py: 1, borderRadius: '12px', bgcolor: hit ? 'var(--group-soft)' : 'transparent' }}
              >
                <Typography component="span" variant="body2" sx={{ fontFamily: 'monospace', color: 'var(--group)', pt: '2px' }}>
                  {clock(seg.start)}
                </Typography>
                <Typography component="span" sx={{ lineHeight: 1.55 }}>
                  {seg.text}
                </Typography>
              </Box>
            )
          })}
        </Box>
      </Box>

      <Box component="aside" aria-label="Usar a transcrição" sx={{ flex: '1 1 260px', display: 'grid', gap: 2 }}>
        <Box sx={{ bgcolor: 'background.paper', borderRadius: '20px', p: 2.5, display: 'grid', gap: 1.25 }}>
          <Typography sx={{ fontWeight: 800 }}>Baixar</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1 }}>
            <Button variant="contained" startIcon={<Download />} onClick={() => save(toText(segments), 'txt', 'text/plain')} sx={{ bgcolor: 'var(--group)', color: 'var(--on-group)' }}>
              TXT
            </Button>
            <Button variant="outlined" onClick={() => save(toSrt(segments), 'srt', 'application/x-subrip')} aria-label="Baixar legenda SRT">
              SRT
            </Button>
            <Button variant="outlined" onClick={() => save(toVtt(segments), 'vtt', 'text/vtt')} aria-label="Baixar legenda VTT">
              VTT
            </Button>
          </Box>
          <Typography variant="body2" color="text.secondary">
            SRT e VTT são legendas, para usar junto do vídeo.
          </Typography>
          <Button startIcon={<ContentCopy />} onClick={copy}>
            Copiar texto
          </Button>
        </Box>
        {user?.permissions.includes(AI) && (
          <Box sx={{ bgcolor: 'background.paper', borderRadius: '20px', p: 2.5, display: 'grid', gap: 1.25 }}>
            <Typography sx={{ fontWeight: 800 }}>Continuar com o texto</Typography>
            <Button component={RouterLink} to={CHAT_PATH} variant="outlined" onClick={toChat}>
              Levar para a IA
            </Button>
            <Typography variant="body2" color="text.secondary">
              Abre uma conversa com a transcrição anexada, para resumir ou listar tarefas.
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  )
}
