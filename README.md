# trem.FRONT

Login page and catalog of the self-hosted services (Immich, Radarr, Sonarr, Prowlarr,
qBittorrent...), with an admin area to manage them. Accounts, passwords, the second factor
and the catalog itself come from [trem.API](https://github.com/DidiProjects/trem.API).

React 19 · TypeScript · Vite 8 · MUI 9 · React Router 7 · Zod 4 · Vitest.

## Running

```bash
cp .env.example .env          # optional: VITE_API_URL
npm install
npm start                     # http://localhost:3004
```

The front calls trem.API directly at `VITE_API_URL` (default `http://localhost:3002`).
trem.API must list the front's origin in `CORS_ORIGINS` (`http://localhost:3004` in
development).

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
  cookie (path `/auth`), out of reach of JavaScript. trem.API is on another domain, so the
  cookie is `SameSite=None; Partitioned` (CHIPS) and every call goes with
  `credentials: "include"`. The access token (15 min) stays in memory only.
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

The services live in trem.API (`/hub/services`): name, description, address, logo and
order. The catalog shows what trem.API returns for the account: enabled services with an
address, granted with the permission `hub:<service>`.

### Administration (`/admin/services`)

For accounts holding `trem:admin`, from the account menu ("Serviços do catálogo"). trem.API
also requires the login to have used the second factor (TOTP); without it the page says so.

- Create, edit, hide, reorder and remove services. The identifier becomes the permission
  `hub:<identifier>` and cannot change; removing a service removes the permission and every
  grant of it.
- Logo: PNG, WebP or SVG up to 256 KB, sent to trem.API and served from there.
- "Acesso": one switch per active account. The change does not end the account's session;
  it shows the next time the catalog opens.

The five initial services come from trem.API's migration 010 with their logos
([dashboard-icons](https://github.com/homarr-labs/dashboard-icons), Apache-2.0) and no
address: fill it in the admin area for each to appear.

## Deploy (Netlify)

`.github/workflows/deploy.yml` runs on every push to `main`: lint, tests, build (with
`VITE_API_URL` from `TREM_API_URL`), deploy. `netlify.toml` only serves `index.html` for the
client-side routes; the API is not proxied.

Repository configuration:

| Kind | Name | Value |
|---|---|---|
| variable | `TREM_API_URL` | trem.API's origin, `https://api.didilv93.com` |
| secret | `NETLIFY_AUTH_TOKEN` | Netlify personal access token |
| secret | `NETLIFY_SITE_ID` | the site's ID |

In trem.API: `FRONTEND_URL` = this site's URL, so the e-mail links open here, and this
site's origin in `CORS_ORIGINS`.
