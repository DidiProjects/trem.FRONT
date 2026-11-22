import { Box, Button, Stack, Typography } from '@mui/material'
import { oidc } from '@/services/oidc'

/** Password, second factor and sessions are kept at authentik. */
export function SecuritySection() {
  return (
    <Stack spacing={1.5} sx={{ maxWidth: 560 }}>
      <Typography>
        Senha, verificação em duas etapas e sessões abertas ficam na sua conta do servidor de login.
      </Typography>
      <Box>
        <Button variant="contained" href={oidc.accountUrl()} target="_blank" rel="noopener">
          Abrir minha conta de login
        </Button>
      </Box>
    </Stack>
  )
}
