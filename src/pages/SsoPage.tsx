import { useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { Alert, Box, Button, CircularProgress, Link, Stack, Typography } from '@mui/material'
import { AuthLayout } from '@/components/AuthLayout'
import { ServiceLogo } from '@/components/ServiceLogo'
import { useAuth } from '@/hooks/useAuth'
import { useLoad } from '@/hooks/useLoad'
import { usePageTitle } from '@/hooks/usePageTitle'
import { logoSrc } from '@/services/hubApi'
import { ssoApi } from '@/services/ssoApi'
import { leaveTo } from '@/utils/leave'

const BAD_LINK = 'Este link de login não é válido. Volte ao serviço e tente entrar de novo.'
const EXPIRED = 'Este pedido de login expirou ou já foi usado. Volte ao serviço e tente entrar de novo.'

function Problem({ message }: { message: string }) {
  usePageTitle('Login')
  return (
    <AuthLayout title="Não foi possível entrar">
      <Alert severity="warning">{message}</Alert>
    </AuthLayout>
  )
}

function Pending({ request }: { request: string }) {
  usePageTitle('Login')
  const { logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { result, reload } = useLoad(() => ssoApi.view(request))
  const [busy, setBusy] = useState<'approve' | 'deny' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const answer = async (kind: 'approve' | 'deny') => {
    setBusy(kind)
    setError(null)
    try {
      const { redirect } = await (kind === 'approve' ? ssoApi.approve(request) : ssoApi.deny(request))
      // trem.API built it from the redirect URI registered for the client, never from the request.
      leaveTo(redirect)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Algo deu errado. Tente de novo.')
      setBusy(null)
    }
  }

  const switchAccount = async () => {
    await logout()
    navigate('/login', { replace: true, state: { from: location.pathname + location.search } })
  }

  if (result.state === 'loading') {
    return (
      <AuthLayout title="Login">
        <Box sx={{ display: 'grid', placeItems: 'center', py: 2 }}>
          <CircularProgress aria-label="Carregando pedido de login" />
        </Box>
      </AuthLayout>
    )
  }

  if (result.state === 'error') {
    if (result.error.status === 404) return <Problem message={EXPIRED} />
    return (
      <AuthLayout title="Login">
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={reload}>
              Tentar de novo
            </Button>
          }
        >
          {result.error.message}
        </Alert>
      </AuthLayout>
    )
  }

  const { service_name: name, logo_url: logo, username, allowed } = result.data
  const other = (
    <>
      Não é você?{' '}
      <Link component="button" type="button" onClick={() => void switchAccount()} disabled={busy !== null}>
        Entrar com outra conta
      </Link>
    </>
  )

  if (!allowed) {
    return (
      <AuthLayout title={`Sem acesso a ${name}`} footer={other}>
        <Stack spacing={2}>
          <Typography>
            A conta <strong>{username}</strong> não tem acesso a {name}. Peça ao administrador do trem para liberar o
            serviço.
          </Typography>
          {error && <Alert severity="error">{error}</Alert>}
          <Button variant="outlined" loading={busy === 'deny'} onClick={() => void answer('deny')}>
            Voltar para {name}
          </Button>
        </Stack>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title={`Entrar em ${name}`} subtitle={`${name} quer usar sua conta do trem.`} footer={other}>
      <Stack spacing={3}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <ServiceLogo name={name} src={logoSrc(logo)} size={48} />
          <Typography>
            Continuar como <strong>{username}</strong>
          </Typography>
        </Stack>
        {error && <Alert severity="error">{error}</Alert>}
        <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={1.5} sx={{ justifyContent: 'flex-end' }}>
          <Button color="inherit" disabled={busy === 'approve'} loading={busy === 'deny'} onClick={() => void answer('deny')}>
            Cancelar
          </Button>
          <Button variant="contained" disabled={busy === 'deny'} loading={busy === 'approve'} onClick={() => void answer('approve')}>
            Continuar como {username}
          </Button>
        </Stack>
      </Stack>
    </AuthLayout>
  )
}

/**
 * trem.API sends a service's login here (/sso?request=…): the session lives in this front,
 * so this is where the account confirms it, and trem.API answers with where to go next.
 */
export function SsoPage() {
  const [params] = useSearchParams()
  const request = params.get('request')
  if (params.get('error') || !request) return <Problem message={BAD_LINK} />
  return <Pending key={request} request={request} />
}
