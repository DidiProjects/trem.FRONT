/**
 * Writes dist/_redirects for Netlify.
 *
 * /auth and /me are proxied (status 200) to trem.API, so the browser sees one origin:
 * the HttpOnly session cookie (SameSite=Strict, path /auth) works on any Netlify
 * domain and the API needs no CORS. Everything else falls back to the SPA.
 *
 * Side effect: trem.API sees Netlify's address, so its per-IP limits (sign-up,
 * forgot-password) are shared by everyone using this front. Per-account limits are not.
 *
 *   TREM_API_URL=https://api.didilv93.com node scripts/write-redirects.mjs
 */
import { writeFileSync, existsSync } from 'node:fs'

const api = (process.env.TREM_API_URL ?? '').trim().replace(/\/+$/, '')
if (!/^https:\/\/[^/]+$/.test(api)) {
  console.error('TREM_API_URL must be an https origin, e.g. https://api.example.com')
  process.exit(1)
}
if (!existsSync('dist')) {
  console.error('dist/ not found: run the build first')
  process.exit(1)
}

const rules = [
  `/auth/*  ${api}/auth/:splat  200!`,
  `/me      ${api}/me  200!`,
  `/me/*    ${api}/me/:splat  200!`,
  '/*       /index.html  200',
]
writeFileSync('dist/_redirects', rules.join('\n') + '\n')
console.log(`dist/_redirects -> ${api}`)
