# trem.FRONT

Login page and catalog of the self-hosted services (Immich, Radarr, Sonarr, Prowlarr,
qBittorrent). Accounts, passwords and the second factor come from
[trem.API](https://github.com/DidiProjects/trem.API).

React 19 · TypeScript · Vite 8 · MUI 9 · React Router 7 · Zod 4 · Vitest.

## Running

```bash
cp .env.example .env          # VITE_SERVICES_HOST = the server's Tailscale IP
npm install
npm start                     # http://localhost:3004
```

The dev server forwards `/auth` and `/me` to trem.API (`API_PROXY_TARGET`, default
`http://127.0.0.1:3002`). To use the production API: `API_PROXY_TARGET=https://api.didilv93.com npm start`.

```bash
npm run lint
npm run test:run
npm run build
```

## Authentication

| Piece | Where |
|---|---|
| HTTP and error parsing (field errors, `Retry-After`) | `src/services/http.ts` |
| Session: access token in memory, refresh by cookie, renewal, tabs | `src/services/session.ts` |
| trem.API calls | `src/services/authApi.ts` |
| State and actions for the pages | `src/contexts/AuthProvider.tsx`, `useAuth()` |
| Route guards | `src/routes/guards.tsx` |

- Login asks trem.API for `session: "cookie"`: the refresh token lives in an HttpOnly
  cookie (SameSite=Strict, path `/auth`), out of reach of JavaScript. The access token
  (15 min) stays in memory only.
- The session survives reloads: a flag without any secret in `localStorage` says a
  restore is worth trying; the page then calls `POST /auth/refresh` once.
- The access token is renewed a minute before it expires, when a tab comes back from the
  background, and once on any 401 (then the request is retried).
- Refreshes are single flight in a tab and serialized across tabs with Web Locks: trem.API
  rotates the refresh token and treats a reused one as theft, so two tabs refreshing at
  once would end the login. Logout reaches the other tabs through `BroadcastChannel`.
- Flows: login, TOTP or recovery code, provisional password (forced change), voluntary
  change (logs in again with the new password, since trem.API ends every session),
  sign-up with e-mail confirmation, forgot and reset password.
- E-mail links arrive as `/#verify-email=<token>` and `/#reset-password=<token>`. The
  token leaves the address bar and the history before the app renders and stays in memory.
  trem.API writes the links to `FRONTEND_URL`, which must be this site's address.
- Forms validate on blur and on submit with the same password policy as trem.API (12+
  characters, not repetitive, without the username or e-mail). The API checks again,
  including known breaches, and its message shows on the field.

## Catalog

`src/constants/services.ts` lists the services and their ports; the address is
`http://<VITE_SERVICES_HOST>:<port>`. Each service appears only for accounts holding the
permission `hub:<id>` in trem.API. Logos: [dashboard-icons](https://github.com/homarr-labs/dashboard-icons)
(Apache-2.0), in `src/assets/logos`.

To add a service: an entry in `SERVICES`, its logo, and the permission in trem.API.

### Permissions in trem.API (once, with an admin login)

With the Postman collection of trem.API (Admin folders):

1. `POST /admin/applications` `{"slug": "hub", "name": "trem.FRONT"}`
2. `POST /admin/applications/hub/permissions` once per service: `{"name": "immich"}`,
   `radarr`, `sonarr`, `prowlarr`, `qbittorrent`
3. `PUT /admin/users/{id}/permissions` with the full set of the account, e.g.
   `{"permissions": ["trem:ai", "hub:immich", "hub:radarr"]}` (it replaces the set: keep
   the ones the account already has). Sign-ups get them on `POST /admin/users/{id}/approve`.

## Deploy (Netlify)

`.github/workflows/deploy.yml` runs on every push to `main`: lint, tests, build, then
`scripts/write-redirects.mjs` writes `dist/_redirects`, which proxies `/auth/*` and `/me`
to trem.API. Front and API share an origin as far as the browser knows, so the session
cookie works on any Netlify domain and trem.API needs no CORS.

Repository configuration:

| Kind | Name | Value |
|---|---|---|
| variable | `SERVICES_HOST` | the server's Tailscale IP |
| variable | `TREM_API_URL` | `https://api.didilv93.com` |
| variable | `SERVICES_PROTOCOL` | optional, `http` (default) or `https` |
| secret | `NETLIFY_AUTH_TOKEN` | Netlify personal access token |
| secret | `NETLIFY_SITE_ID` | the site's ID |

In trem.API: the variable `FRONTEND_URL` = this site's URL, so the e-mail links open here.

Trade-off of the proxy: trem.API sees Netlify's address, so its per-IP limits (sign-up,
forgot password) are shared by everyone using this site. Per-account limits are not.
