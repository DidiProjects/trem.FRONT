import { Box, Typography } from '@mui/material'
import CheckCircle from '@mui/icons-material/CheckCircle'
import RadioButtonUnchecked from '@mui/icons-material/RadioButtonUnchecked'
import { passwordRules } from '@/utils/validation'

interface Props {
  password: string
  username?: string
  email?: string
}

export function PasswordChecklist({ password, username, email }: Props) {
  const rules = passwordRules(password, username, email)
  return (
    <Box component="ul" aria-label="Requisitos da senha" sx={{ listStyle: 'none', p: 0, m: 0, display: 'grid', gap: 0.5 }}>
      {rules.map((rule) => (
        <Box
          component="li"
          key={rule.label}
          sx={{ display: 'flex', alignItems: 'center', gap: 1, color: rule.ok ? 'success.main' : 'text.secondary' }}
        >
          {rule.ok ? <CheckCircle sx={{ fontSize: 16 }} /> : <RadioButtonUnchecked sx={{ fontSize: 16 }} />}
          <Typography variant="body2">{rule.label}</Typography>
        </Box>
      ))}
      <Typography component="li" variant="caption" color="text.secondary">
        Dica: uma frase longa é mais forte e mais fácil de lembrar. Senhas que aparecem em vazamentos conhecidos são
        recusadas.
      </Typography>
    </Box>
  )
}
