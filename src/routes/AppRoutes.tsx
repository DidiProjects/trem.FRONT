import { Navigate, Route, Routes } from 'react-router'
import { AppLayout } from '@/components/AppLayout'
import { AccountPage } from '@/pages/AccountPage'
import { CatalogPage } from '@/pages/CatalogPage'
import { ChangePasswordPage } from '@/pages/ChangePasswordPage'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { ResetPasswordPage } from '@/pages/ResetPasswordPage'
import { VerifyEmailPage } from '@/pages/VerifyEmailPage'
import { AnonymousOnly, RequireAuth, RequireSession } from './guards'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AnonymousOnly />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      {/* E-mail links work with or without a session. */}
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route element={<RequireSession />}>
        <Route path="/change-password" element={<ChangePasswordPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route index element={<CatalogPage />} />
          <Route path="/account" element={<AccountPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
