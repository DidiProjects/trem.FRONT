import { Suspense, type ReactNode } from 'react'
import { Link as RouterLink } from 'react-router'
import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material'
import LockOutlined from '@mui/icons-material/LockOutlined'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useAuth } from '@/hooks/useAuth'
import { ToolContext } from '@/products/toolContext'
import type { ProductGroup, Tool } from '@/products/types'

function NoAccess({ group }: { group: ProductGroup }) {
  usePageTitle('Sem acesso')
  return (
    <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center', py: 8 }}>
      <LockOutlined sx={{ fontSize: 48, color: 'text.secondary' }} aria-hidden />
      <Typography variant="h1">{group.label} não está liberado para você</Typography>
      <Typography color="text.secondary" sx={{ maxWidth: 460 }}>
        Peça ao administrador do trem para liberar este produto na sua conta. Depois disso, ele aparece no menu.
      </Typography>
      <Button component={RouterLink} to="/" variant="contained">
        Voltar ao início
      </Button>
    </Stack>
  )
}

/** The group's tools only for accounts holding its permission; the API checks it again. */
export function Guarded({ group, children }: { group: ProductGroup; children: ReactNode }) {
  const { user } = useAuth()
  if (!user?.permissions.includes(group.permission)) return <NoAccess group={group} />
  return <>{children}</>
}

export function ToolRoute({ group, tool }: { group: ProductGroup; tool: Tool }) {
  const Page = tool.page
  return (
    <Guarded group={group}>
      <ToolContext.Provider value={{ group, tool }}>
        <Suspense
          fallback={
            <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
              <CircularProgress aria-label="Carregando ferramenta" />
            </Box>
          }
        >
          <Page />
        </Suspense>
      </ToolContext.Provider>
    </Guarded>
  )
}

