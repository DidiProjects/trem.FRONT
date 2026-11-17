import { Navigate, Outlet, useLocation } from 'react-router'
import { FullPageError, FullPageSpinner } from '@/components/FullPageStatus'
import { useAuth } from '@/hooks/useAuth'

function Pending() {
  const { status, retry } = useAuth()
  if (status === 'unavailable') {
    return <FullPageError message="O servidor de login não respondeu. Verifique sua conexão." onRetry={retry} />
  }
  return <FullPageSpinner />
}

/** Logged in with a password of their own. */
export function RequireAuth() {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'loading' || status === 'unavailable') return <Pending />
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (status === 'must-change-password') return <Navigate to="/change-password" replace />
  return <Outlet />
}

/** Logged in, including with a provisional password (the change-password page). */
export function RequireSession() {
  const { status } = useAuth()
  if (status === 'loading' || status === 'unavailable') return <Pending />
  if (status === 'anonymous') return <Navigate to="/login" replace />
  return <Outlet />
}

/** Login, sign-up and forgot-password: nothing to do there with a session. */
export function AnonymousOnly() {
  const { status } = useAuth()
  if (status === 'loading' || status === 'unavailable') return <Pending />
  if (status === 'must-change-password') return <Navigate to="/change-password" replace />
  if (status === 'authenticated') return <Navigate to="/" replace />
  return <Outlet />
}
