// trem.API's origin in development.
const DEV_API_URL = 'http://localhost:3002'

// authentik's `trem` provider (trem.AUTH), e.g. https://auth.didilv93.com/application/o/trem/.
// The only login: without it nobody can enter.
const issuer = (import.meta.env.VITE_OIDC_ISSUER ?? '').trim()

export const env = {
  apiUrl: (import.meta.env.VITE_API_URL || DEV_API_URL).trim().replace(/\/+$/, ''),
  oidcIssuer: issuer && !issuer.endsWith('/') ? `${issuer}/` : issuer,
  oidcClientId: (import.meta.env.VITE_OIDC_CLIENT_ID || 'trem').trim(),
}
