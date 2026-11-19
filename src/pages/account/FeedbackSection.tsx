import { useState, type FormEvent } from 'react'
import { Alert, Box, Button, FormControlLabel, FormLabel, Radio, RadioGroup, TextField, Typography } from '@mui/material'
import { useAuth } from '@/hooks/useAuth'
import { accountApi, type FeedbackType } from '@/services/accountApi'

const MAX = 5000

export function FeedbackSection() {
  const { user } = useAuth()
  const [type, setType] = useState<FeedbackType>('suggestion')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState(user?.email ?? '')
  const [state, setState] = useState<{ kind: 'idle' | 'sending' | 'sent' } | { kind: 'error'; message: string }>({ kind: 'idle' })

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setState({ kind: 'sending' })
    try {
      await accountApi.feedback(type, message.trim(), email.trim() || null)
      setState({ kind: 'sent' })
      setMessage('')
    } catch (e) {
      setState({ kind: 'error', message: (e as Error).message })
    }
  }

  return (
    <Box component="section" aria-labelledby="feedback-title" sx={{ bgcolor: 'background.paper', borderRadius: '20px', p: { xs: 2, sm: 3 }, display: 'grid', gap: 2 }}>
      <Typography id="feedback-title" variant="h2">
        Fale com o administrador
      </Typography>
      {state.kind === 'sent' ? (
        <Alert severity="success" role="status" action={<Button color="inherit" onClick={() => setState({ kind: 'idle' })}>Mandar outra</Button>}>
          Mensagem enviada. Obrigado!
        </Alert>
      ) : (
        <Box component="form" onSubmit={submit} sx={{ display: 'grid', gap: 2, maxWidth: 640 }}>
          <Box>
            <FormLabel id="feedback-type" sx={{ fontWeight: 800, color: 'text.primary' }}>
              Sobre o quê?
            </FormLabel>
            <RadioGroup row aria-labelledby="feedback-type" value={type} onChange={(e) => setType(e.target.value as FeedbackType)}>
              <FormControlLabel value="suggestion" control={<Radio />} label="Sugestão" />
              <FormControlLabel value="bug" control={<Radio />} label="Algo quebrado" />
              <FormControlLabel value="other" control={<Radio />} label="Outro assunto" />
            </RadioGroup>
          </Box>
          <TextField
            label="Mensagem"
            multiline
            minRows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, MAX))}
            helperText={`${message.length} de ${MAX} caracteres${type === 'bug' ? '. Conte o que fez, o que esperava e o que aconteceu.' : ''}`}
          />
          <TextField label="E-mail para resposta (opcional)" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          {state.kind === 'error' && <Alert severity="error">{state.message}</Alert>}
          <Box>
            <Button type="submit" variant="contained" disabled={!message.trim() || state.kind === 'sending'}>
              Enviar
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  )
}
