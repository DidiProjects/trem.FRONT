import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Link as RouterLink, useNavigate, useParams } from 'react-router'
import { Alert, Box, Button, Chip, Collapse, IconButton, List, ListItemButton, ListItemText, TextField, Tooltip, Typography, useMediaQuery } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import Add from '@mui/icons-material/Add'
import ArrowUpward from '@mui/icons-material/ArrowUpward'
import AttachFile from '@mui/icons-material/AttachFile'
import Close from '@mui/icons-material/Close'
import DeleteOutlined from '@mui/icons-material/DeleteOutlined'
import ExpandMore from '@mui/icons-material/ExpandMore'
import StopRounded from '@mui/icons-material/StopRounded'
import { useAuth } from '@/hooks/useAuth'
import { handoff } from '@/products/handoff'
import { ToolLayout } from '@/products/ToolLayout'
import { useTool } from '@/products/toolContext'
import { MAX_BODY, llmApi, type ModelStatus } from '@/services/llmApi'
import { formatBytes } from '@/utils/text'
import { chatStore, useChats, type Chat } from './chatStore'
import { Message } from './Message'
import { lifted } from './surface'

const HEALTH_MS = 20_000
const STARTERS = ['Resuma este texto em tópicos', 'Escreva um e-mail educado recusando um convite', 'Explique este erro e como corrigir', 'Ideias de passeio para o fim de semana']
const STATUS: Record<ModelStatus | 'unknown', { label: string; color: 'success' | 'warning' | 'error' | 'default' }> = {
  unknown: { label: 'Verificando o modelo…', color: 'default' },
  healthy: { label: 'Modelo pronto', color: 'success' },
  sleeping: { label: 'Modelo dormindo: acorda quando você escrever', color: 'warning' },
  warming_up: { label: 'Acordando o modelo, leva alguns minutos', color: 'warning' },
  offline: { label: 'Modelo fora do ar', color: 'error' },
}

function useModelStatus() {
  const [status, setStatus] = useState<ModelStatus | 'unknown'>('unknown')
  useEffect(() => {
    let active = true
    const check = () =>
      llmApi.health().then(
        (s) => active && setStatus(s),
        () => active && setStatus('offline'),
      )
    void check()
    const timer = setInterval(check, HEALTH_MS)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [])
  return [status, setStatus] as const
}

function pendingText(chat: Chat, status: ModelStatus | 'unknown'): string {
  const seconds = Math.round((Date.now() - (chat.pending?.since ?? Date.now())) / 1000)
  const waking = status === 'sleeping' || status === 'warming_up'
  if (chat.pending?.status === 'sending') return 'Enviando…'
  if (waking) return `Esperando o modelo acordar · ${seconds} s`
  if (chat.pending?.status === 'queued') return `Na fila · ${seconds} s`
  return `Escrevendo · ${seconds} s`
}

function useTick(active: boolean) {
  const [, setNow] = useState(0)
  useEffect(() => {
    if (!active) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [active])
}

export default function ChatPage() {
  const { group, tool } = useTool()
  const { user } = useAuth()
  const navigate = useNavigate()
  const id = useParams()['*'] || null
  const chats = useChats()
  const chat = chats.find((c) => c.id === id) ?? null
  const [status, setStatus] = useModelStatus()
  const [draft, setDraft] = useState('')
  const [attachment, setAttachment] = useState<File | null>(() => handoff.take(tool.path)[0] ?? null)
  const [listOpen, setListOpen] = useState(false)
  const wide = useMediaQuery(useTheme().breakpoints.up('md'), { noSsr: true, defaultMatches: true })
  const fileRef = useRef<HTMLInputElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  useTick(Boolean(chat?.pending))

  useEffect(() => {
    if (user?.id) chatStore.open(user.id)
  }, [user?.id])

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' })
  }, [chat?.messages.length, chat?.pending])

  const onType = (value: string) => {
    setDraft(value)
    // Waking takes minutes: start while the question is still being typed.
    if (status === 'sleeping' && value.trim()) {
      setStatus('warming_up')
      void llmApi.wake()
    }
  }

  const send = async (text = draft) => {
    const body = text.trim()
    if (!body || chat?.pending) return
    const attached = attachment ? `\n\n--- Anexo: ${attachment.name} ---\n${await attachment.text()}` : ''
    const newId = chatStore.send(chat?.id ?? null, body + attached)
    setDraft('')
    setAttachment(null)
    if (newId !== id) navigate(`${tool.path}/${newId}`)
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    void send()
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      void send()
    }
  }

  const tooBig = attachment ? attachment.size > MAX_BODY : false

  return (
    <ToolLayout group={group} tool={tool} subtitle="O modelo roda no servidor de casa. As conversas ficam só neste navegador.">
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <Box component="nav" aria-label="Conversas" sx={{ flex: '1 1 220px', bgcolor: 'background.paper', borderRadius: '20px', p: 1 }}>
          <Button
            fullWidth
            variant="contained"
            startIcon={<Add />}
            component={RouterLink}
            to={tool.path}
            sx={[lifted, { mb: 1 }]}
          >
            Nova conversa
          </Button>
          {!wide && (
            <Button
              fullWidth
              onClick={() => setListOpen((o) => !o)}
              aria-expanded={listOpen}
              endIcon={<ExpandMore sx={{ transform: listOpen ? 'rotate(180deg)' : 'none' }} />}
              sx={{ justifyContent: 'space-between' }}
            >
              Conversas ({chats.length})
            </Button>
          )}
          <Collapse in={wide || listOpen}>
            <List dense disablePadding>
              {chats.map((c) => (
                <ListItemButton
                  key={c.id}
                  component={RouterLink}
                  to={`${tool.path}/${c.id}`}
                  selected={c.id === id}
                  aria-current={c.id === id ? 'page' : undefined}
                  sx={{ borderRadius: '12px' }}
                >
                  <ListItemText primary={c.title} secondary={c.pending ? 'Respondendo…' : undefined} slotProps={{ primary: { noWrap: true } }} />
                </ListItemButton>
              ))}
              {chats.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ p: 1.5 }}>
                  Nenhuma conversa ainda.
                </Typography>
              )}
            </List>
          </Collapse>
        </Box>

        <Box component="section" aria-label={chat?.title ?? 'Nova conversa'} sx={{ flex: '999 1 480px', minWidth: 0, display: 'grid', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <Chip role="status" label={STATUS[status].label} color={STATUS[status].color} variant="outlined" sx={{ fontWeight: 700 }} />
            <Box sx={{ flexGrow: 1 }} />
            {chat && (
              <Tooltip title="Apagar conversa">
                <IconButton
                  aria-label="Apagar conversa"
                  onClick={() => {
                    chatStore.remove(chat.id)
                    navigate(tool.path)
                  }}
                >
                  <DeleteOutlined />
                </IconButton>
              </Tooltip>
            )}
          </Box>

          {!chat && (
            <Box sx={{ textAlign: 'center', py: { xs: 2, sm: 4 } }}>
              <Typography variant="h2" sx={{ mb: 2 }}>
                Como posso ajudar?
              </Typography>
              <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 220px), 1fr))' }}>
                {STARTERS.map((s) => (
                  <Button key={s} variant="outlined" onClick={() => onType(s)} sx={{ justifyContent: 'flex-start', textAlign: 'left', py: 1.5, borderRadius: '16px' }}>
                    {s}
                  </Button>
                ))}
              </Box>
            </Box>
          )}

          {chat && (
            <Box component="ol" aria-label="Mensagens" aria-live="polite" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gap: 1.5 }}>
              {chat.messages.map((m, i) => (
                <Message key={i} message={m} />
              ))}
            </Box>
          )}

          {chat?.pending && (
            <Box role="status" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
              <Typography variant="body2">{pendingText(chat, status)}</Typography>
              <Button size="small" startIcon={<StopRounded />} onClick={() => chatStore.stop(chat.id)}>
                Parar de esperar
              </Button>
            </Box>
          )}
          {chat?.error && (
            <Alert severity="error" action={<Button color="inherit" onClick={() => chatStore.retry(chat.id)}>Tentar de novo</Button>}>
              {chat.error}
            </Alert>
          )}
          <div ref={endRef} />

          <Box component="form" onSubmit={onSubmit} sx={{ bgcolor: 'background.paper', borderRadius: '24px', p: 1, display: 'grid', gap: 1 }}>
            {attachment && (
              <Box sx={{ px: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Chip label={`Anexo: ${attachment.name} · ${formatBytes(attachment.size)}`} color={tooBig ? 'error' : 'default'} />
                  <IconButton size="small" aria-label={`Remover anexo ${attachment.name}`} onClick={() => setAttachment(null)}>
                    <Close fontSize="small" />
                  </IconButton>
                </Box>
                {tooBig && (
                  <Typography variant="body2" color="error" sx={{ mt: 0.5 }}>
                    Grande demais para uma pergunta: o limite é de uns 60 KB de texto.
                  </Typography>
                )}
              </Box>
            )}
            <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
              <Tooltip title="Anexar arquivo de texto">
                <IconButton aria-label="Anexar arquivo de texto" onClick={() => fileRef.current?.click()}>
                  <AttachFile />
                </IconButton>
              </Tooltip>
              <input
                ref={fileRef}
                type="file"
                hidden
                accept=".txt,.md,.csv,.json,.srt,.vtt,text/*"
                onChange={(e) => {
                  setAttachment(e.target.files?.[0] ?? null)
                  e.target.value = ''
                }}
              />
              <TextField
                multiline
                maxRows={8}
                label="Mensagem"
                placeholder="Escreva uma mensagem"
                value={draft}
                onChange={(e) => onType(e.target.value)}
                onKeyDown={onKeyDown}
                variant="standard"
                helperText="Enter envia · Shift Enter quebra a linha"
                slotProps={{ input: { disableUnderline: true } }}
                sx={{ flexGrow: 1 }}
              />
              <IconButton
                type="submit"
                aria-label="Enviar"
                disabled={!draft.trim() || Boolean(chat?.pending) || tooBig}
                sx={[lifted, { width: 48, height: 48 }]}
              >
                <ArrowUpward />
              </IconButton>
            </Box>
          </Box>
        </Box>
      </Box>
    </ToolLayout>
  )
}
