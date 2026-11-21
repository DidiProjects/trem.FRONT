// trem.API's origin. `localhost`, not 127.0.0.1, in development: the front runs on
// localhost too, and the session cookie (SameSite=Strict over plain HTTP) needs one site.
const DEV_API_URL = 'http://localhost:3002'

// authentik's `trem` provider (trem.AUTH), e.g. https://auth.didilv93.com/application/o/trem/.
// Set: login goes through authentik. Empty: trem.API's own login, as before.
const issuer = (import.meta.env.VITE_OIDC_ISSUER ?? '').trim()

export const env = {
  apiUrl: (import.meta.env.VITE_API_URL || DEV_API_URL).trim().replace(/\/+$/, ''),
  oidcIssuer: issuer && !issuer.endsWith('/') ? `${issuer}/` : issuer,
  oidcClientId: (import.meta.env.VITE_OIDC_CLIENT_ID || 'trem').trim(),
}

export const usesAuthentik = (): boolean => Boolean(env.oidcIssuer)
