import { Navigate, Route, Routes } from 'react-router'
import { AppLayout } from '@/components/AppLayout'
import { AccountPage } from '@/pages/AccountPage'
import { AuthCallbackPage } from '@/pages/AuthCallbackPage'
import { ChangePasswordPage } from '@/pages/ChangePasswordPage'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { HomePage } from '@/pages/HomePage'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { ResetPasswordPage } from '@/pages/ResetPasswordPage'
import { ServicesPage } from '@/pages/ServicesPage'
import { TasksPage } from '@/pages/TasksPage'
import { VerifyEmailPage } from '@/pages/VerifyEmailPage'
import { AdminAppsPage } from '@/pages/admin/AdminAppsPage'
import { AdminServicesPage } from '@/pages/admin/AdminServicesPage'
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage'
import { AnonymousOnly, RequireAdmin, RequireAuth, RequireSession } from './guards'
import { productRoutes } from './productRoutes'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AnonymousOnly />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      {/* E-mail links work with or without a session. */}
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route element={<RequireSession />}>
        <Route path="/change-password" element={<ChangePasswordPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="/servicos" element={<ServicesPage />} />
          <Route path="/tarefas" element={<TasksPage />} />
          {productRoutes()}
          <Route path="/account/*" element={<AccountPage />} />
          <Route element={<RequireAdmin />}>
            <Route path="/admin/services" element={<AdminServicesPage />} />
            <Route path="/admin/usuarios" element={<AdminUsersPage />} />
            <Route path="/admin/aplicacoes/*" element={<AdminAppsPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
