import { StrictMode } from 'react'
import { render } from '@testing-library/react'
import App from '@/App'
import { ME, fakeToken, json } from './fakeApi'

/** Renders the whole app at `path` with a stored session, as after a reload. */
export function openAt(path: string) {
  localStorage.setItem('trem.session', '1')
  window.history.replaceState(null, '', path)
  return render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

/** Routes for a logged-in account holding these extra permissions. */
export function loggedIn(...permissions: string[]) {
  const me = { ...ME, permissions: [...ME.permissions, ...permissions] }
  return {
    'POST /auth/refresh': () => json({ access_token: fakeToken() }),
    'GET /me': () => json(me),
  }
}

export const fileInput = () => document.querySelector<HTMLInputElement>('input[type=file]')!

/** A binary answer; jsdom's Blob is not accepted by Node's Response. */
export const binary = (body: string, type: string) => new Response(body, { headers: { 'Content-Type': type } })
