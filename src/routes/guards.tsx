import { Navigate, Outlet, useLocation } from 'react-router'
import { FullPageError, FullPageSpinner } from '@/components/FullPageStatus'
import { useAuth } from '@/hooks/useAuth'
import { isAdmin } from '@/utils/roles'

function Pending() {
  const { status, retry } = useAuth()
  if (status === 'unavailable') {
    return <FullPageError message="O servidor de login não respondeu. Verifique sua conexão." onRetry={retry} />
  }
  return <FullPageSpinner />
}

/** Logged in. */
export function RequireAuth() {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'loading' || status === 'unavailable') return <Pending />
  // With the query: /sso?request=… must come back whole after the login.
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return <Outlet />
}

/** Accounts holding trem:admin; trem.API still checks it, with the second factor. */
export function RequireAdmin() {
  const { user } = useAuth()
  if (!isAdmin(user?.permissions)) return <Navigate to="/" replace />
  return <Outlet />
}

/** Where RequireAuth was headed, if it is a path of this app ("//host" would leave it). */
function returnTo(state: unknown): string {
  const from = (state as { from?: unknown } | null)?.from
  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') && !from.startsWith('/login')
    ? from
    : '/'
}

/** The login page: nothing to do there with a session. */
export function AnonymousOnly() {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'loading' || status === 'unavailable') return <Pending />
  // The login ends here as soon as the session exists, so this is what takes it back.
  if (status === 'authenticated') return <Navigate to={returnTo(location.state)} replace />
  return <Outlet />
}
