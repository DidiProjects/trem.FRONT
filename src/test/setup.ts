import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'
import { env } from '@/config/env'
import { ISSUER } from './fakeApi'

// Tool pages load on demand: the first import of a chunk takes over a second when the
// test files run in parallel, past findBy's default 1 s.
configure({ asyncUtilTimeout: 5000 })

// The only login is authentik's; the tests use a fake issuer (fakeApi answers it).
beforeEach(() => {
  env.oidcIssuer = ISSUER
})

afterEach(() => {
  cleanup()
  localStorage.clear()
  sessionStorage.clear()
})
