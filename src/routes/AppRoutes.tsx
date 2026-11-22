import { Navigate, Route, Routes } from 'react-router'
import { AppLayout } from '@/components/AppLayout'
import { AccountPage } from '@/pages/AccountPage'
import { AuthCallbackPage } from '@/pages/AuthCallbackPage'
import { HomePage } from '@/pages/HomePage'
import { AuthentikLogin } from '@/pages/AuthentikLogin'
import { ServicesPage } from '@/pages/ServicesPage'
import { TasksPage } from '@/pages/TasksPage'
import { AdminAppsPage } from '@/pages/admin/AdminAppsPage'
import { AdminServicesPage } from '@/pages/admin/AdminServicesPage'
import { AnonymousOnly, RequireAdmin, RequireAuth } from './guards'
import { productRoutes } from './productRoutes'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AnonymousOnly />}>
        <Route path="/login" element={<AuthentikLogin />} />
      </Route>

      <Route path="/auth/callback" element={<AuthCallbackPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="/servicos" element={<ServicesPage />} />
          <Route path="/tarefas" element={<TasksPage />} />
          {productRoutes()}
          <Route path="/account/*" element={<AccountPage />} />
          <Route element={<RequireAdmin />}>
            <Route path="/admin/services" element={<AdminServicesPage />} />
            <Route path="/admin/aplicacoes/*" element={<AdminAppsPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
