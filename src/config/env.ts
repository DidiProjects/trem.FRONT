// trem.API's origin. `localhost`, not 127.0.0.1, in development: the front runs on
// localhost too, and the session cookie (SameSite=Strict over plain HTTP) needs one site.
const DEV_API_URL = 'http://localhost:3002'

export const env = {
  apiUrl: (import.meta.env.VITE_API_URL || DEV_API_URL).trim().replace(/\/+$/, ''),
  servicesHost: (import.meta.env.VITE_SERVICES_HOST ?? '').trim(),
  servicesProtocol: import.meta.env.VITE_SERVICES_PROTOCOL === 'https' ? 'https' : 'http',
}
