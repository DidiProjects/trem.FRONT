# trem.FRONT

The trem's web app, on [trem.API](https://github.com/DidiProjects/trem.API): login, the
**products** (the API's own tools: PDF, images, audio and video, AI, LinkedIn automation),
the **services** of the server (Immich, Jellyfin, Radarr... each with its own login) and
the administration of accounts, permissions and keys.

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

## Products and services

Two kinds of things, kept apart in the menu, Home, Ctrl K and the admin:

- **Products** are tools of the trem, used here with the trem login. They come in groups,
  each with its route, color and the permission that unlocks it. The registry is
  `src/products/registry.ts`; each group lists its tools in `src/products/<group>/index.ts`.
- **Services** are separate apps of the server, opened in a new tab. They come from the
  catalog below.

| Group | Routes | Permission | trem.API |
|---|---|---|---|
| Documentos | `/documentos/*` (9 tools) | `trem:file_editor` | `/pdf/*` |
| Imagens | `/imagens/*` (3) | `trem:file_editor` | `/image/*` |
| Áudio e vídeo | `/midia/cortar`, `/midia/transcrever` | `trem:file_editor` | `/movie/*`, `/audio/*` |
| IA | `/ia/conversa` | `trem:ai` | `/llm/*` |
| Automação | `/automacoes/linkedin` | `trem:linkedin_scraper` | `/scrapers/linkedin/*` |

A group without its permission is not shown anywhere, and its routes explain how to ask
for it (trem.API checks the permission again on every call). Other pages: `/servicos`,
`/tarefas`, `/account/*` (profile, second factor, API keys, feedback),
`/admin/usuarios`, `/admin/aplicacoes/*`, `/admin/services`.

Navigation: a sidebar (a drawer below `md`), **Ctrl K** to jump to any product, service,
page or account action, and Home, which suggests the tools for a dropped file and lists
the tools used last. A produced file can go on to another tool without a new upload
(`src/products/handoff.ts`, memory only).

- File tools share `FileTool` (drop, options, run, download). Files are named by the front:
  trem.API does not expose `Content-Disposition` to other origins.
- Transcriptions go up in parts (Cloudflare drops requests above 100 MB) and are followed
  by a runner in the layout; `/tarefas` lists them. trem.API keeps jobs in memory, so a
  restart loses them and the page says so.
- Chat questions go as jobs (`/llm/jobs`), since a sleeping model takes minutes.
- Conversations, tasks and recent tools stay in this browser's `localStorage`, per account.

## Catalog

The services live in trem.API (`/hub/services`): name, description, address, logo and
order. The catalog shows what trem.API returns for the account: enabled services with an
address, granted with the permission `hub:<service>`.

### Administration

`/admin/usuarios` approves sign-ups and sets what each account may use, with the same
split: products, services, other applications, administration. `/admin/aplicacoes` manages
applications, their permissions and service keys (the personal keys are in Minha conta).
The catalog of services is `/admin/services`:

For accounts holding `trem:admin`, from the account menu ("Serviços do catálogo"). trem.API
also requires the login to have used the second factor (TOTP); without it the page says so.

- Create, edit, hide, reorder and remove services. The identifier becomes the permission
  `hub:<identifier>` and cannot change; removing a service removes the permission and every
  grant of it.
- Logo: PNG, WebP or SVG up to 256 KB, sent to trem.API and served from there.
- "Acesso": one switch per active account. The change does not end the account's session;
  it shows the next time the catalog opens.
- "Login único": the service logs people in with their trem account (OpenID Connect,
  trem.API `docs/oidc.md`). Set the redirect URIs exactly as the service sends them (http
  only for local or Tailscale addresses); the client secret shows once, and "Gerar novo
  segredo" replaces it at once. The dialog lists the issuer, discovery URL and client ID to
  paste in the service.

### Login of a hub service (`/sso`)

trem.API sends a service's login to `/sso?request=…`: the session lives in this front (the
refresh cookie is partitioned under its site), so this is where the account confirms
"Continuar como <user>". trem.API answers with the address to go back to, built from the
redirect URI registered for the service, never from the request. Without a session the
login page comes first and returns to the same `/sso?request=…`. An account without
`hub:<service>` is told so and can only go back. Netlify serves `/sso` with
`frame-ancestors 'none'`, so it cannot be framed into a hidden click.

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
